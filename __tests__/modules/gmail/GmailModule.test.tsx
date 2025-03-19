import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import GmailModule from '../../../app/modules/gmail/GmailModule';
import { AssistantProvider } from '../../../app/context/AssistantContext';
import { ModulesProvider } from '../../../app/context/ModulesContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock des contextes
jest.mock('../../../app/context/AssistantContext', () => ({
  useAssistant: () => ({
    addMemory: jest.fn(),
  }),
  AssistantProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../../app/context/ModulesContext', () => ({
  useModules: () => ({
    isModuleEnabled: () => true,
  }),
  ModulesProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Données simulées
const mockEmails = [
  {
    id: 'email1',
    from: 'contact@example.com',
    subject: 'Test Email 1',
    date: '2023-08-15T14:30:00Z',
    snippet: 'Contenu du premier email de test...',
    isRead: false,
    isImportant: true,
    labels: ['Inbox', 'Important'],
  },
  {
    id: 'email2',
    from: 'info@example.org',
    subject: 'Test Email 2',
    date: '2023-08-14T10:15:00Z',
    snippet: 'Contenu du second email de test...',
    isRead: true,
    isImportant: false,
    labels: ['Inbox'],
  },
];

describe('GmailModule', () => {
  beforeEach(() => {
    // Réinitialiser les mocks
    jest.clearAllMocks();
    // Simuler la réponse de l'API pour la récupération des emails
    mockedAxios.get.mockResolvedValue({ data: mockEmails });
    // Simuler la réponse pour l'analyse des emails
    mockedAxios.post.mockResolvedValue({ 
      data: { 
        analysis: 'Analyse des emails: 2 emails reçus, 1 non lu, 1 important.' 
      } 
    });
  });

  test('Charger les emails au montage du composant', async () => {
    render(<GmailModule isVisible={true} />);
    
    // Vérifier que la requête a été effectuée
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/modules/gmail/emails', {
      params: { filter: 'all' }
    });
    
    // Attendre que les emails soient affichés
    await waitFor(() => {
      expect(screen.getByText('Test Email 1')).toBeInTheDocument();
      expect(screen.getByText('Test Email 2')).toBeInTheDocument();
    });
  });

  test('Filtrer les emails', async () => {
    render(<GmailModule isVisible={true} />);
    
    // Attendre que les emails soient chargés
    await waitFor(() => {
      expect(screen.getByText('Test Email 1')).toBeInTheDocument();
    });
    
    // Cliquer sur le filtre non lus
    const unreadFilter = screen.getByText('Non lus');
    fireEvent.click(unreadFilter);
    
    // Vérifier que la requête a été effectuée avec le bon filtre
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/modules/gmail/emails', {
      params: { filter: 'unread' }
    });
  });

  test('Analyser les emails sélectionnés', async () => {
    render(<GmailModule isVisible={true} />);
    
    // Attendre que les emails soient chargés
    await waitFor(() => {
      expect(screen.getByText('Test Email 1')).toBeInTheDocument();
    });
    
    // Sélectionner un email
    const emailCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(emailCheckbox);
    
    // Cliquer sur le bouton d'analyse
    const analyzeButton = screen.getByText('Analyser les emails sélectionnés');
    fireEvent.click(analyzeButton);
    
    // Vérifier que la requête d'analyse a été effectuée
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/modules/gmail/analyze', {
        emails: [mockEmails[0]]
      });
    });
    
    // Vérifier que le résultat de l'analyse est affiché
    await waitFor(() => {
      expect(screen.getByText('Analyse des emails: 2 emails reçus, 1 non lu, 1 important.')).toBeInTheDocument();
    });
  });
}); 