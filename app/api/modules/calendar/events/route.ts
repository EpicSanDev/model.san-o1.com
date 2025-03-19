import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { 
  getGoogleCalendarEvents, 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent, 
  deleteGoogleCalendarEvent 
} from '../../../../services/googleCalendarService';
import { 
  indexCalendarEvent, 
  deleteCalendarEventVector 
} from '../../../../services/qdrantService';

const prisma = new PrismaClient();

// Récupérer la session utilisateur
async function getSession() {
  return await getServerSession(authOptions);
}

// POST /api/modules/calendar/events - Récupérer ou créer des événements
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.user?.email ? 
      (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id : 
      'system';
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Cas 1: Récupération d'événements dans une plage de dates
    if (body.startDate && body.endDate) {
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);
      
      // Récupérer les événements locaux
      const localEvents = await prisma.calendarEvent.findMany({
        where: {
          userId,
          OR: [
            // Événements qui commencent dans la plage
            {
              start: {
                gte: startDate,
                lte: endDate,
              },
            },
            // Événements qui finissent dans la plage
            {
              end: {
                gte: startDate,
                lte: endDate,
              },
            },
            // Événements qui encadrent la plage
            {
              AND: [
                {
                  start: {
                    lte: startDate,
                  },
                },
                {
                  end: {
                    gte: endDate,
                  },
                },
              ],
            },
          ],
        },
        orderBy: {
          start: 'asc',
        },
      });
      
      let allEvents = [...localEvents];
      
      // Si l'utilisateur est connecté à Google Calendar, récupérer les événements
      if (session?.accessToken) {
        try {
          const googleEvents = await getGoogleCalendarEvents(
            session.accessToken as string, 
            startDate, 
            endDate
          );
          
          // Fusionner les événements Google Calendar qui ne sont pas déjà dans notre base
          const googleEventIds = new Set(googleEvents.map(e => e.googleEventId));
          const localGoogleEventIds = new Set(localEvents
            .filter(e => e.googleEventId)
            .map(e => e.googleEventId));
          
          // Ajouter les événements de Google qui ne sont pas encore dans notre base
          const newGoogleEvents = googleEvents.filter(e => 
            !localGoogleEventIds.has(e.googleEventId)
          );
          
          // Synchroniser les nouveaux événements avec notre base
          for (const event of newGoogleEvents) {
            const newEvent = await prisma.calendarEvent.create({
              data: {
                id: uuidv4(),
                title: event.title,
                start: event.start,
                end: event.end,
                description: event.description || null,
                location: event.location || null,
                isAllDay: event.isAllDay || false,
                userId,
                googleEventId: event.googleEventId,
                googleCalendarId: 'primary',
                synced: true,
              },
            });
            
            // Indexer l'événement dans Qdrant
            await indexCalendarEvent(newEvent);
            
            allEvents.push(newEvent);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des événements Google Calendar:', error);
        }
      }
      
      return NextResponse.json({ events: allEvents });
    }
    
    // Cas 2: Création d'un nouvel événement
    if (body.event) {
      const { title, start, end, description, location, isAllDay } = body.event;
      
      // Validation des champs obligatoires
      if (!title || !start || !end) {
        return NextResponse.json(
          { error: 'Titre, date de début et date de fin sont obligatoires' },
          { status: 400 }
        );
      }
      
      // Préparer les données de l'événement
      const eventData = {
        id: uuidv4(),
        title,
        start: new Date(start),
        end: new Date(end),
        description: description || null,
        location: location || null,
        isAllDay: isAllDay || false,
        userId,
        googleEventId: null,
        googleCalendarId: null,
        synced: false,
      };
      
      // Si l'utilisateur est connecté à Google Calendar, créer également l'événement dans Google
      if (session?.accessToken) {
        try {
          const googleEvent = await createGoogleCalendarEvent(
            session.accessToken as string,
            {
              title,
              start: new Date(start),
              end: new Date(end),
              description,
              location,
              isAllDay,
            }
          );
          
          eventData.googleEventId = googleEvent.googleEventId;
          eventData.googleCalendarId = 'primary';
          eventData.synced = true;
        } catch (error) {
          console.error('Erreur lors de la création de l\'événement dans Google Calendar:', error);
        }
      }
      
      // Créer l'événement dans la base de données
      const event = await prisma.calendarEvent.create({
        data: eventData,
      });
      
      // Indexer l'événement dans Qdrant
      await indexCalendarEvent(event);
      
      return NextResponse.json({ event }, { status: 201 });
    }
    
    return NextResponse.json(
      { error: 'Requête invalide' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erreur lors de la gestion des événements du calendrier:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la gestion des événements' },
      { status: 500 }
    );
  }
}

// PATCH /api/modules/calendar/events/[id] - Mettre à jour un événement
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const userId = session?.user?.email ?
      (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id :
      null;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }
    
    const eventId = params.id;
    const body = await request.json();
    
    // Vérifier si l'événement existe et appartient à l'utilisateur
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        userId,
      },
    });
    
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé ou non autorisé' },
        { status: 404 }
      );
    }
    
    // Extraire les données mises à jour
    const { title, start, end, description, location, isAllDay } = body.event;
    
    // Mettre à jour l'événement dans la base de données
    const updatedEventData = {
      title: title || existingEvent.title,
      start: start ? new Date(start) : existingEvent.start,
      end: end ? new Date(end) : existingEvent.end,
      description: description !== undefined ? description : existingEvent.description,
      location: location !== undefined ? location : existingEvent.location,
      isAllDay: isAllDay !== undefined ? isAllDay : existingEvent.isAllDay,
    };
    
    // Si l'événement est synchronisé avec Google Calendar, le mettre à jour également
    if (existingEvent.googleEventId && session?.accessToken) {
      try {
        await updateGoogleCalendarEvent(
          session.accessToken as string,
          {
            ...updatedEventData,
            googleEventId: existingEvent.googleEventId,
          }
        );
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'événement dans Google Calendar:', error);
      }
    }
    
    // Mettre à jour l'événement dans la base de données
    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updatedEventData,
    });
    
    // Mettre à jour l'événement dans Qdrant
    await indexCalendarEvent(updatedEvent);
    
    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour de l\'événement' },
      { status: 500 }
    );
  }
}

// DELETE /api/modules/calendar/events/[id] - Supprimer un événement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const userId = session?.user?.email ?
      (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id :
      null;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }
    
    const eventId = params.id;
    
    // Vérifier si l'événement existe et appartient à l'utilisateur
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        userId,
      },
    });
    
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Événement non trouvé ou non autorisé' },
        { status: 404 }
      );
    }
    
    // Si l'événement est synchronisé avec Google Calendar, le supprimer également
    if (existingEvent.googleEventId && session?.accessToken) {
      try {
        await deleteGoogleCalendarEvent(
          session.accessToken as string,
          existingEvent.googleEventId
        );
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'événement dans Google Calendar:', error);
      }
    }
    
    // Supprimer l'événement de la base de données
    await prisma.calendarEvent.delete({
      where: { id: eventId },
    });
    
    // Supprimer l'événement de Qdrant
    await deleteCalendarEventVector(eventId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression de l\'événement' },
      { status: 500 }
    );
  }
}

// GET /api/modules/calendar/events - Récupérer tous les événements
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.user?.email ?
      (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id :
      null;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    // Si une recherche est fournie, utiliser Qdrant pour une recherche sémantique
    if (search) {
      const { searchSimilarEvents } = await import('../../../../services/qdrantService');
      const events = await searchSimilarEvents(search, userId);
      return NextResponse.json({ events });
    }
    
    // Sinon, récupérer tous les événements de l'utilisateur
    const events = await prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { start: 'asc' },
    });
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des événements' },
      { status: 500 }
    );
  }
} 