import { google } from 'googleapis';
import { CalendarEvent } from '../types';

// Configuration de l'API Google
const configureGoogleCalendar = (accessToken: string) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({
    access_token: accessToken
  });
  
  return google.calendar({ version: 'v3', auth });
};

// Récupérer les événements Google Calendar
export async function getGoogleCalendarEvents(accessToken: string, timeMin: Date, timeMax: Date): Promise<Partial<CalendarEvent>[]> {
  try {
    const calendar = configureGoogleCalendar(accessToken);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items?.map(event => ({
      id: event.id,
      title: event.summary || 'Sans titre',
      start: new Date(event.start?.dateTime || event.start?.date || ''),
      end: new Date(event.end?.dateTime || event.end?.date || ''),
      description: event.description || '',
      location: event.location || '',
      isAllDay: !event.start?.dateTime, // Si dateTime n'est pas défini, c'est un événement toute la journée
      googleEventId: event.id, // Conserver l'ID Google pour les opérations futures
      googleCalendarId: 'primary',
      synced: true,
    })) || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des événements Google Calendar:', error);
    throw error;
  }
}

// Créer un événement dans Google Calendar
export async function createGoogleCalendarEvent(accessToken: string, event: Partial<CalendarEvent>): Promise<Partial<CalendarEvent>> {
  try {
    const calendar = configureGoogleCalendar(accessToken);
    
    const googleEvent = {
      summary: event.title,
      description: event.description || '',
      location: event.location || '',
      start: event.isAllDay 
        ? { date: event.start?.toISOString().split('T')[0] }
        : { dateTime: event.start?.toISOString() },
      end: event.isAllDay 
        ? { date: event.end?.toISOString().split('T')[0] }
        : { dateTime: event.end?.toISOString() },
    };
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: googleEvent,
    });
    
    return {
      ...event,
      googleEventId: response.data.id,
      googleCalendarId: 'primary',
      synced: true,
    };
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement Google Calendar:', error);
    throw error;
  }
}

// Mettre à jour un événement dans Google Calendar
export async function updateGoogleCalendarEvent(accessToken: string, event: Partial<CalendarEvent>): Promise<Partial<CalendarEvent>> {
  try {
    if (!event.googleEventId) {
      throw new Error('ID Google Calendar manquant');
    }
    
    const calendar = configureGoogleCalendar(accessToken);
    
    const googleEvent = {
      summary: event.title,
      description: event.description || '',
      location: event.location || '',
      start: event.isAllDay 
        ? { date: event.start?.toISOString().split('T')[0] }
        : { dateTime: event.start?.toISOString() },
      end: event.isAllDay 
        ? { date: event.end?.toISOString().split('T')[0] }
        : { dateTime: event.end?.toISOString() },
    };
    
    await calendar.events.update({
      calendarId: 'primary',
      eventId: event.googleEventId,
      requestBody: googleEvent,
    });
    
    return {
      ...event,
      synced: true,
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement Google Calendar:', error);
    throw error;
  }
}

// Supprimer un événement dans Google Calendar
export async function deleteGoogleCalendarEvent(accessToken: string, googleEventId: string): Promise<boolean> {
  try {
    const calendar = configureGoogleCalendar(accessToken);
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement Google Calendar:', error);
    throw error;
  }
}

// Synchroniser les événements entre la base de données locale et Google Calendar
export async function syncGoogleCalendar(accessToken: string, userId: string, fromDate: Date, toDate: Date): Promise<{
  added: Partial<CalendarEvent>[];
  updated: Partial<CalendarEvent>[];
  deleted: string[];
}> {
  try {
    // Cette fonction implémente la synchronisation bi-directionnelle
    // entre les événements locaux et Google Calendar
    
    // Pour l'instant, on retourne un résultat de synchronisation vide
    return {
      added: [],
      updated: [],
      deleted: [],
    };
  } catch (error) {
    console.error('Erreur lors de la synchronisation avec Google Calendar:', error);
    throw error;
  }
} 