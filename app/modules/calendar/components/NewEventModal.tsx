'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarEvent } from '../types';

interface NewEventModalProps {
  date: Date;
  onClose: () => void;
  onSubmit: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
}

const NewEventModal: React.FC<NewEventModalProps> = ({ date, onClose, onSubmit }) => {
  const [title, setTitle] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(date, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endDate, setEndDate] = useState<string>(format(date, 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState<string>('10:00');
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [isAllDay, setIsAllDay] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation de base
    if (!title.trim()) {
      setError('Le titre est obligatoire');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Créer les objets Date pour le début et la fin
      const start = isAllDay 
        ? new Date(`${startDate}T00:00:00`)
        : new Date(`${startDate}T${startTime}:00`);
        
      const end = isAllDay 
        ? new Date(`${endDate}T23:59:59`) 
        : new Date(`${endDate}T${endTime}:00`);

      // Vérifier que la date de fin est après la date de début
      if (end <= start) {
        setError('La date de fin doit être après la date de début');
        setIsLoading(false);
        return;
      }

      // Préparer l'événement
      const newEvent: Omit<CalendarEvent, 'id'> = {
        title,
        start,
        end,
        description: description || undefined,
        location: location || undefined,
        isAllDay,
      };

      // Soumettre l'événement
      await onSubmit(newEvent);
      onClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la création de l\'événement');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Nouvel événement - {format(date, 'dd MMMM yyyy', { locale: fr })}
          </h2>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="title">
                Titre *
              </label>
              <input
                id="title"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Titre de l'événement"
              />
            </div>
            
            <div className="mb-4">
              <label className="flex items-center text-gray-700 text-sm font-medium">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                  checked={isAllDay}
                  onChange={() => setIsAllDay(!isAllDay)}
                />
                <span className="ml-2">Toute la journée</span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="startDate">
                  Date de début *
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              
              {!isAllDay && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="startTime">
                    Heure de début *
                  </label>
                  <input
                    id="startTime"
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="endDate">
                  Date de fin *
                </label>
                <input
                  id="endDate"
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              
              {!isAllDay && (
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="endTime">
                    Heure de fin *
                  </label>
                  <input
                    id="endTime"
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="location">
                Lieu
              </label>
              <input
                id="location"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Lieu de l'événement"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de l'événement"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                onClick={onClose}
                disabled={isLoading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
              >
                {isLoading ? 'Création...' : 'Créer l\'événement'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewEventModal; 