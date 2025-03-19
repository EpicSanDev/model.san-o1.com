'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarEvent } from '../types';
import EventItem from './EventItem';
import NewEventModal from './NewEventModal';
import EventDetailModal from './EventDetailModal';

interface MonthViewProps {
  events: CalendarEvent[];
  onEventAdd: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  onEventUpdate: (event: CalendarEvent) => Promise<void>;
  onEventDelete: (eventId: string) => Promise<void>;
  isLoading?: boolean;
}

const MonthView: React.FC<MonthViewProps> = ({ 
  events, 
  onEventAdd, 
  onEventUpdate, 
  onEventDelete, 
  isLoading = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  
  // Navigation entre les mois
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };
  
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  // Génération des jours du calendrier
  const generateCalendar = () => {
    // Premier jour du mois
    const monthStart = startOfMonth(currentMonth);
    // Dernier jour du mois
    const monthEnd = endOfMonth(monthStart);
    // Premier jour de la semaine (lundi)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    // Dernier jour de la semaine (dimanche)
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    // Générer un tableau de tous les jours à afficher
    const allDays = eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });
    
    // Regrouper les jours par semaine
    const weeks = [];
    let week = [];
    
    for (const day of allDays) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    
    return weeks;
  };
  
  // Obtenir les événements pour un jour spécifique
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return isSameDay(eventDate, day);
    });
  };
  
  // Ouvrir le modal pour ajouter un événement
  const handleAddEvent = (date: Date) => {
    setSelectedDate(date);
    setIsNewEventModalOpen(true);
  };
  
  // Ouvrir le modal de détails de l'événement
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };
  
  // Fermer le modal de détails
  const handleCloseDetailModal = () => {
    setSelectedEvent(null);
    setIsDetailModalOpen(false);
  };
  
  // Fermer le modal d'ajout d'événement
  const handleCloseNewEventModal = () => {
    setSelectedDate(null);
    setIsNewEventModalOpen(false);
  };
  
  // Soumettre un nouvel événement
  const handleSubmitNewEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    await onEventAdd(event);
    setIsNewEventModalOpen(false);
  };
  
  // Mettre à jour un événement
  const handleUpdateEvent = async (event: CalendarEvent) => {
    await onEventUpdate(event);
    setIsDetailModalOpen(false);
  };
  
  // Supprimer un événement
  const handleDeleteEvent = async (eventId: string) => {
    await onEventDelete(eventId);
    setIsDetailModalOpen(false);
  };
  
  // Rendu du calendrier
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* En-tête du calendrier */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-800">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={prevMonth}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Mois précédent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors duration-200 text-sm font-medium"
          >
            Aujourd'hui
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Mois suivant"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Corps du calendrier */}
      <div className="p-6">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 mb-4">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
            <div key={index} className="text-center font-medium text-gray-500 text-sm py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grille du calendrier */}
        <div className="grid grid-cols-7 gap-2">
          {isLoading ? (
            <div className="col-span-7 h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            generateCalendar().map((week, weekIndex) => (
              week.map((day, dayIndex) => {
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const dayEvents = getEventsForDay(day);
                
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`min-h-[100px] p-2 border rounded-lg transition-all duration-200 ${
                      isToday ? 'border-blue-500 border-2' : 'border-gray-200'
                    } ${
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50 opacity-70'
                    } hover:border-blue-300 relative`}
                    onClick={() => handleAddEvent(day)}
                  >
                    <div className={`text-right font-medium text-sm ${
                      isToday ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                      {dayEvents.slice(0, 3).map((event) => (
                        <EventItem 
                          key={event.id} 
                          event={event} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }} 
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{dayEvents.length - 3} événement(s)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ))
          )}
        </div>
      </div>
      
      {/* Modal pour ajouter un événement */}
      {isNewEventModalOpen && selectedDate && (
        <NewEventModal
          date={selectedDate}
          onClose={handleCloseNewEventModal}
          onSubmit={handleSubmitNewEvent}
        />
      )}
      
      {/* Modal pour voir/modifier un événement */}
      {isDetailModalOpen && selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={handleCloseDetailModal}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
};

export default MonthView; 