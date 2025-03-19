'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarEvent } from '../types';

interface EventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onUpdate: (event: CalendarEvent) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ 
  event, 
  onClose, 
  onUpdate, 
  onDelete 
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  
  // État pour les formulaires d'édition
  const [title, setTitle] = useState<string>(event.title);
  const [startDate, setStartDate] = useState<string>(format(new Date(event.start), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState<string>(format(new Date(event.start), 'HH:mm'));
  const [endDate, setEndDate] = useState<string>(format(new Date(event.end), 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState<string>(format(new Date(event.end), 'HH:mm'));
  const [description, setDescription] = useState<string>(event.description || '');
  const [location, setLocation] = useState<string>(event.location || '');
  const [isAllDay, setIsAllDay] = useState<boolean>(event.isAllDay || false);
  
  // Formater la date pour l'affichage
  const formatEventDate = (date: Date, showTime: boolean = true): string => {
    if (showTime && !isAllDay) {
      return format(new Date(date), 'dd MMMM yyyy à HH:mm', { locale: fr });
    }
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  };
  
  // Gérer la soumission du formulaire de mise à jour
  const handleUpdateSubmit = async (e: React.FormEvent) => {
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
      
      // Préparer l'événement mis à jour
      const updatedEvent: CalendarEvent = {
        ...event,
        title,
        start,
        end,
        description: description || undefined,
        location: location || undefined,
        isAllDay,
      };
      
      // Soumettre la mise à jour
      await onUpdate(updatedEvent);
      setIsEditing(false);
    } catch (err) {
      setError('Une erreur est survenue lors de la mise à jour de l\'événement');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gérer la suppression d'un événement
  const handleDeleteConfirm = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onDelete(event.id);
      onClose();
    } catch (err) {
      setError('Une erreur est survenue lors de la suppression de l\'événement');
      console.error(err);
      setIsLoading(false);
      setIsDeleteConfirmOpen(false);
    }
  };
  
  // Mode affichage (non édition)
  const renderViewMode = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-gray-500 text-sm font-medium">Détails de l'événement</h3>
        <div className="mt-2 text-gray-900">
          {event.description ? (
            <p className="text-sm whitespace-pre-wrap">{event.description}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">Aucune description</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">Date et heure</h3>
          <div className="mt-1">
            <p className="text-sm">
              <span className="font-medium">Début: </span>
              {formatEventDate(event.start)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Fin: </span>
              {formatEventDate(event.end)}
            </p>
            {event.isAllDay && (
              <p className="text-sm text-blue-600 font-medium mt-1">
                Événement toute la journée
              </p>
            )}
          </div>
        </div>
        
        {event.location && (
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Lieu</h3>
            <p className="mt-1 text-sm">{event.location}</p>
          </div>
        )}
      </div>
      
      {event.googleEventId && (
        <div className="mt-2 text-sm text-blue-600 flex items-center">
          <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.554 3.921 1.465l2.814-2.814A9.981 9.981 0 0 0 12.545 1.5c-5.523 0-10 4.477-10 10s4.477 10 10 10c8.396 0 10.201-7.938 9.342-11.261h-9.342z"/>
          </svg>
          Synchronisé avec Google Calendar
        </div>
      )}
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          onClick={() => setIsDeleteConfirmOpen(true)}
        >
          Supprimer
        </button>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          onClick={() => setIsEditing(true)}
        >
          Modifier
        </button>
      </div>
    </div>
  );
  
  // Mode édition
  const renderEditMode = () => (
    <form onSubmit={handleUpdateSubmit}>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="edit-title">
          Titre *
        </label>
        <input
          id="edit-title"
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
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
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="edit-startDate">
            Date de début *
          </label>
          <input
            id="edit-startDate"
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        
        {!isAllDay && (
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="edit-startTime">
              Heure de début *
            </label>
            <input
              id="edit-startTime"
              type="time"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
        )}
        
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="edit-endDate">
            Date de fin *
          </label>
          <input
            id="edit-endDate"
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        
        {!isAllDay && (
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="edit-endTime">
              Heure de fin *
            </label>
            <input
              id="edit-endTime"
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
        <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="edit-location">
          Lieu
        </label>
        <input
          id="edit-location"
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="edit-description">
          Description
        </label>
        <textarea
          id="edit-description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          onClick={() => setIsEditing(false)}
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
          {isLoading ? 'Mise à jour...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
  
  // Modal de confirmation de suppression
  const renderDeleteConfirmation = () => (
    <div className="p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Confirmer la suppression</h3>
      <p className="text-sm text-gray-600 mb-4">
        Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
      </p>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          onClick={() => setIsDeleteConfirmOpen(false)}
          disabled={isLoading}
        >
          Annuler
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors ${
            isLoading ? 'opacity-75 cursor-not-allowed' : ''
          }`}
          onClick={handleDeleteConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Suppression...' : 'Supprimer'}
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 truncate flex-1">
              {isEditing ? 'Modifier l\'événement' : event.title}
            </h2>
            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
              disabled={isLoading}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Contenu principal */}
          {isDeleteConfirmOpen ? (
            renderDeleteConfirmation()
          ) : (
            isEditing ? renderEditMode() : renderViewMode()
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal; 