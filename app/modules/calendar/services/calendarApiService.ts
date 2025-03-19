import { v4 as uuidv4 } from 'uuid';
import { getSession } from 'next-auth/react';
import { CalendarEvent } from '../types';
import { 
  getGoogleCalendarEvents, 
  createGoogleCalendarEvent, 
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent 
} from './googleCalendarService';
import {
  indexCalendarEvent,
  deleteCalendarEventVector,
  searchSimilarEvents
} from './qdrantService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Récupérer les événements dans une plage de dates
export async function fetchEvents(startDate: Date, endDate: Date, userId: string): Promise<CalendarEvent[]> {
  try {
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
    
    // Récupérer la session pour vérifier le token Google Calendar
    const session = await getSession();
    
    // Si l'utilisateur est connecté à Google Calendar, récupérer les événements
    if (session?.accessToken) {
      try {
        const googleEvents = await getGoogleCalendarEvents(
          session.accessToken as string, 
          startDate, 
          endDate
        );
        
        // Filtrer les événements Google qui ne sont pas déjà dans notre base
        const localGoogleEventIds = new Set(
          localEvents
            .filter(e => e.googleEventId)
            .map(e => e.googleEventId)
        );
        
        // Ajouter les événements de Google qui ne sont pas encore dans notre base
        const newGoogleEvents = googleEvents.filter(e => 
          e.googleEventId && !localGoogleEventIds.has(e.googleEventId)
        );
        
        // Synchroniser les nouveaux événements avec notre base
        for (const event of newGoogleEvents) {
          const newEvent = await prisma.calendarEvent.create({
            data: {
              id: uuidv4(),
              title: event.title || '',
              start: event.start || new Date(),
              end: event.end || new Date(),
              description: event.description || null,
              location: event.location || null,
              isAllDay: event.isAllDay || false,
              userId,
              googleEventId: event.googleEventId || null,
              googleCalendarId: 'primary',
              synced: true,
            },
          });
          
          // Indexer l'événement dans Qdrant
          await indexCalendarEvent(newEvent as CalendarEvent);
          
          allEvents.push(newEvent as CalendarEvent);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des événements Google Calendar:', error);
      }
    }
    
    return allEvents as CalendarEvent[];
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    throw error;
  }
}

// Créer un nouvel événement
export async function createEvent(eventData: Omit<CalendarEvent, 'id'>, userId: string): Promise<CalendarEvent> {
  try {
    const session = await getSession();
    
    // Préparer les données de l'événement
    const newEvent = {
      id: uuidv4(),
      title: eventData.title,
      start: eventData.start,
      end: eventData.end,
      description: eventData.description || null,
      location: eventData.location || null,
      isAllDay: eventData.isAllDay || false,
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
            title: eventData.title,
            start: eventData.start,
            end: eventData.end,
            description: eventData.description,
            location: eventData.location,
            isAllDay: eventData.isAllDay,
          }
        );
        
        if (googleEvent.googleEventId) {
          newEvent.googleEventId = googleEvent.googleEventId;
          newEvent.googleCalendarId = 'primary';
          newEvent.synced = true;
        }
      } catch (error) {
        console.error('Erreur lors de la création de l\'événement dans Google Calendar:', error);
      }
    }
    
    // Créer l'événement dans la base de données
    const createdEvent = await prisma.calendarEvent.create({
      data: newEvent,
    });
    
    // Indexer l'événement dans Qdrant
    await indexCalendarEvent(createdEvent as CalendarEvent);
    
    return createdEvent as CalendarEvent;
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    throw error;
  }
}

// Mettre à jour un événement existant
export async function updateEvent(eventId: string, eventData: Partial<CalendarEvent>, userId: string): Promise<CalendarEvent> {
  try {
    // Vérifier si l'événement existe et appartient à l'utilisateur
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        userId,
      },
    });
    
    if (!existingEvent) {
      throw new Error('Événement non trouvé ou non autorisé');
    }
    
    // Préparer les données mises à jour
    const updatedData = {
      title: eventData.title !== undefined ? eventData.title : existingEvent.title,
      start: eventData.start || existingEvent.start,
      end: eventData.end || existingEvent.end,
      description: eventData.description !== undefined ? eventData.description : existingEvent.description,
      location: eventData.location !== undefined ? eventData.location : existingEvent.location,
      isAllDay: eventData.isAllDay !== undefined ? eventData.isAllDay : existingEvent.isAllDay,
    };
    
    // Récupérer la session pour vérifier le token Google Calendar
    const session = await getSession();
    
    // Si l'événement est synchronisé avec Google Calendar, le mettre à jour également
    if (existingEvent.googleEventId && session?.accessToken) {
      try {
        await updateGoogleCalendarEvent(
          session.accessToken as string,
          {
            ...updatedData,
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
      data: updatedData,
    });
    
    // Mettre à jour l'événement dans Qdrant
    await indexCalendarEvent(updatedEvent as CalendarEvent);
    
    return updatedEvent as CalendarEvent;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error);
    throw error;
  }
}

// Supprimer un événement
export async function deleteEvent(eventId: string, userId: string): Promise<boolean> {
  try {
    // Vérifier si l'événement existe et appartient à l'utilisateur
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id: eventId,
        userId,
      },
    });
    
    if (!existingEvent) {
      throw new Error('Événement non trouvé ou non autorisé');
    }
    
    // Récupérer la session pour vérifier le token Google Calendar
    const session = await getSession();
    
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
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    throw error;
  }
}

// Rechercher des événements par texte
export async function searchEvents(query: string, userId: string): Promise<CalendarEvent[]> {
  try {
    // Utiliser Qdrant pour une recherche sémantique
    const events = await searchSimilarEvents(query, userId);
    return events as CalendarEvent[];
  } catch (error) {
    console.error('Erreur lors de la recherche d\'événements:', error);
    throw error;
  }
} 