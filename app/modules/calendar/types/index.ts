// Types pour les événements du calendrier
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  isAllDay?: boolean;
  googleEventId?: string;
  googleCalendarId?: string;
  synced?: boolean;
  userId?: string;
}

export interface CalendarViewConfig {
  view: 'month' | 'week' | 'day' | 'agenda';
  date: Date;
}

// Types pour les actions du module
export interface CalendarModuleAction {
  moduleId: string;
  action: 'getEvents' | 'addEvent' | 'deleteEvent' | 'updateEvent' | 'searchEvents' | 'syncWithGoogle';
  parameters: Record<string, any>;
}

export interface CalendarModuleActionResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

// Types pour l'authentification Google
export interface GoogleAuthConfig {
  clientId: string;
  apiKey: string;
  scope: string;
  discoveryDocs: string[];
}

// Types pour les recherches Qdrant
export interface SearchResult extends CalendarEvent {
  score: number;
} 