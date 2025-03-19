'use client';

import React, { useState, useEffect } from 'react';
import { ModuleAction, ModuleActionResult } from '../../context/ModulesContext';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  isAllDay?: boolean;
}

// Service pour les opérations du calendrier
class CalendarService {
  // Récupérer les événements
  static async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      const response = await fetch('/api/modules/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate, endDate }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Convertir les chaînes de date en objets Date
        return data.events.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return [];
    }
  }
  
  // Ajouter un événement
  static async addEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> {
    try {
      const response = await fetch('/api/modules/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          ...data.event,
          start: new Date(data.event.start),
          end: new Date(data.event.end),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'événement:', error);
      return null;
    }
  }
  
  // Supprimer un événement
  static async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/modules/calendar/events/${eventId}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'événement:', error);
      return false;
    }
  }
  
  // Mettre à jour un événement
  static async updateEvent(event: CalendarEvent): Promise<CalendarEvent | null> {
    try {
      const response = await fetch(`/api/modules/calendar/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          ...data.event,
          start: new Date(data.event.start),
          end: new Date(data.event.end),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'événement:', error);
      return null;
    }
  }
}

// Traitement des actions du module
export async function processCalendarAction(action: ModuleAction): Promise<ModuleActionResult> {
  try {
    const { action: actionType, parameters } = action;
    
    switch (actionType) {
      case 'getEvents':
        const { startDate, endDate } = parameters as { startDate: string; endDate: string };
        const events = await CalendarService.getEvents(new Date(startDate), new Date(endDate));
        return { success: true, data: { events } };
        
      case 'addEvent':
        const { event } = parameters as { event: Omit<CalendarEvent, 'id'> };
        const newEvent = await CalendarService.addEvent(event);
        return newEvent 
          ? { success: true, data: { event: newEvent } }
          : { success: false, error: 'Erreur lors de l\'ajout de l\'événement' };
        
      case 'deleteEvent':
        const { eventId } = parameters as { eventId: string };
        const deleted = await CalendarService.deleteEvent(eventId);
        return deleted
          ? { success: true }
          : { success: false, error: 'Erreur lors de la suppression de l\'événement' };
        
      case 'updateEvent':
        const { event: eventToUpdate } = parameters as { event: CalendarEvent };
        const updatedEvent = await CalendarService.updateEvent(eventToUpdate);
        return updatedEvent
          ? { success: true, data: { event: updatedEvent } }
          : { success: false, error: 'Erreur lors de la mise à jour de l\'événement' };
        
      default:
        return { success: false, error: 'Action non supportée' };
    }
  } catch (error) {
    console.error('Erreur lors du traitement de l\'action du calendrier:', error);
    return { success: false, error: 'Erreur interne' };
  }
}

// Composant pour l'interface utilisateur du module de calendrier
interface CalendarModuleProps {
  moduleId: string;
  executeAction: (action: ModuleAction) => Promise<ModuleActionResult>;
}

const CalendarModule: React.FC<CalendarModuleProps> = ({ moduleId, executeAction }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Charger les événements pour le mois en cours
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const result = await executeAction({
        moduleId,
        action: 'getEvents',
        parameters: {
          startDate: firstDay.toISOString(),
          endDate: lastDay.toISOString(),
        },
      });
      
      if (result.success && result.data?.events) {
        setEvents(result.data.events);
      }
      
      setLoading(false);
    };
    
    fetchEvents();
  }, [moduleId, executeAction, currentMonth]);
  
  // Naviguer au mois précédent
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  // Naviguer au mois suivant
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  // Formater le nom du mois
  const formatMonth = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };
  
  // Générer le calendrier pour le mois en cours
  const generateCalendar = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const firstDayOfWeek = firstDay.getDay() || 7; // 1 pour lundi, 7 pour dimanche
    const daysInMonth = lastDay.getDate();
    
    const weeks = [];
    let days = [];
    
    // Jours du mois précédent
    for (let i = 1; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
      
      // Nouveau jour de semaine, nouvelle semaine
      if (days.length === 7) {
        weeks.push(days);
        days = [];
      }
    }
    
    // Compléter la dernière semaine avec des jours du mois suivant
    if (days.length > 0) {
      const remainingDays = 7 - days.length;
      for (let i = 0; i < remainingDays; i++) {
        days.push(null);
      }
      weeks.push(days);
    }
    
    return weeks;
  };
  
  // Obtenir les événements pour un jour spécifique
  const getEventsForDay = (day: Date | null): CalendarEvent[] => {
    if (!day) return [];
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === day.getDate() &&
             eventDate.getMonth() === day.getMonth() &&
             eventDate.getFullYear() === day.getFullYear();
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Calendrier</h2>
        <div className="flex space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-lg font-medium">{formatMonth(currentMonth)}</span>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-medium text-gray-500">
        <div>Lun</div>
        <div>Mar</div>
        <div>Mer</div>
        <div>Jeu</div>
        <div>Ven</div>
        <div>Sam</div>
        <div>Dim</div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {generateCalendar().map((week, weekIndex) => (
          week.map((day, dayIndex) => (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={`min-h-[80px] border rounded-md p-1 ${
                day
                  ? 'bg-white'
                  : 'bg-gray-50'
              } ${
                day && day.getDate() === new Date().getDate() &&
                day.getMonth() === new Date().getMonth() &&
                day.getFullYear() === new Date().getFullYear()
                  ? 'border-blue-500 border-2'
                  : 'border-gray-200'
              }`}
            >
              {day && (
                <>
                  <div className="text-right text-sm font-medium">{day.getDate()}</div>
                  <div className="space-y-1 mt-1">
                    {getEventsForDay(day).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 truncate"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))
        ))}
      </div>
    </div>
  );
};

export default CalendarModule; 