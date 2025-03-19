import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CalendarModule from '../../../app/modules/calendar/CalendarModule';

// Mock pour fetch
global.fetch = jest.fn();

// Mock pour les actions du module Calendar
const mockExecuteAction = jest.fn();

// Données simulées
const mockEvents = [
  {
    id: 'event1',
    title: 'Réunion de projet',
    start: new Date('2023-08-15T10:00:00Z'),
    end: new Date('2023-08-15T11:00:00Z'),
    description: 'Discussion sur l\'avancement du projet',
    location: 'Salle de conférence',
    isAllDay: false,
  },
  {
    id: 'event2',
    title: 'Déjeuner d\'équipe',
    start: new Date('2023-08-16T12:00:00Z'),
    end: new Date('2023-08-16T13:30:00Z'),
    description: 'Déjeuner avec l\'équipe de développement',
    location: 'Restaurant du coin',
    isAllDay: false,
  },
];

describe('CalendarModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock de la réponse fetch pour les événements
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url.includes('/api/modules/calendar/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: mockEvents }),
        });
      }
      return Promise.reject(new Error('URL non gérée dans le mock'));
    });
    
    // Mock pour executeAction
    mockExecuteAction.mockImplementation(async (action) => {
      if (action.type === 'FETCH_EVENTS') {
        return { success: true, data: { events: mockEvents } };
      }
      return { success: false, error: 'Action non supportée' };
    });
  });

  test('Affiche correctement les événements du calendrier', async () => {
    render(<CalendarModule moduleId="calendar" executeAction={mockExecuteAction} />);
    
    // Vérifier que l'action FETCH_EVENTS a été appelée
    await waitFor(() => {
      expect(mockExecuteAction).toHaveBeenCalledWith({
        type: 'FETCH_EVENTS',
        moduleId: 'calendar',
        payload: expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      });
    });
    
    // Vérifier que les événements sont affichés
    await waitFor(() => {
      expect(screen.getByText('Réunion de projet')).toBeInTheDocument();
    });
  });

  test('Permet de naviguer entre les mois', async () => {
    render(<CalendarModule moduleId="calendar" executeAction={mockExecuteAction} />);
    
    // Attendre que le calendrier soit chargé
    await waitFor(() => {
      expect(mockExecuteAction).toHaveBeenCalled();
    });
    
    // Récupérer le mois actuel affiché
    const currentMonthElement = screen.getByTestId('current-month');
    const currentMonth = currentMonthElement.textContent;
    
    // Cliquer sur le bouton pour aller au mois suivant
    const nextMonthButton = screen.getByTestId('next-month');
    fireEvent.click(nextMonthButton);
    
    // Vérifier que le mois a changé
    await waitFor(() => {
      expect(currentMonthElement.textContent).not.toBe(currentMonth);
    });
    
    // Vérifier que FETCH_EVENTS a été appelé avec les nouvelles dates
    expect(mockExecuteAction).toHaveBeenCalledTimes(2);
  });

  test('Permet d\'ajouter un nouvel événement', async () => {
    render(<CalendarModule moduleId="calendar" executeAction={mockExecuteAction} />);
    
    // Attendre que le calendrier soit chargé
    await waitFor(() => {
      expect(mockExecuteAction).toHaveBeenCalled();
    });
    
    // Cliquer sur le bouton d'ajout d'événement
    const addEventButton = screen.getByText('Ajouter un événement');
    fireEvent.click(addEventButton);
    
    // Vérifier que le formulaire d'ajout est affiché
    expect(screen.getByText('Nouveau événement')).toBeInTheDocument();
    
    // Remplir le formulaire
    fireEvent.change(screen.getByLabelText('Titre'), {
      target: { value: 'Nouvel événement de test' },
    });
    
    // Soumettre le formulaire
    const submitButton = screen.getByText('Enregistrer');
    fireEvent.click(submitButton);
    
    // Vérifier que l'action ADD_EVENT a été appelée
    await waitFor(() => {
      expect(mockExecuteAction).toHaveBeenCalledWith({
        type: 'ADD_EVENT',
        moduleId: 'calendar',
        payload: expect.objectContaining({
          event: expect.objectContaining({
            title: 'Nouvel événement de test',
          }),
        }),
      });
    });
  });
}); 