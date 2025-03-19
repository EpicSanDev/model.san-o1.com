'use client';

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarEvent } from '../types';

interface EventItemProps {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
  showTime?: boolean;
}

const EventItem: React.FC<EventItemProps> = ({ event, onClick, showTime = false }) => {
  // Fonction pour déterminer la couleur de l'événement (à étendre avec des catégories)
  const getEventColor = () => {
    // Ici, on pourrait implémenter une logique basée sur des catégories d'événements
    // Pour l'instant, on utilise un ensemble de couleurs prédéfinies
    if (event.googleEventId) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (event.isAllDay) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    } else {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div
      className={`${getEventColor()} px-2 py-1 rounded-md text-xs truncate border cursor-pointer hover:opacity-90 transition-opacity duration-150`}
      onClick={onClick}
      title={event.title}
    >
      {showTime && !event.isAllDay && (
        <span className="font-medium mr-1">
          {format(new Date(event.start), 'HH:mm', { locale: fr })}
        </span>
      )}
      {event.title}
      {event.googleEventId && (
        <span className="ml-1 inline-flex items-center">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm6.29 16.29c-.39.39-1.02.39-1.41 0L12 11.41l-4.88 4.88c-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41L10.59 10 5.71 5.12c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0L12 8.59l4.88-4.88c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41L13.41 10l4.88 4.88c.39.39.39 1.02 0 1.41z" />
          </svg>
        </span>
      )}
    </div>
  );
};

export default EventItem; 