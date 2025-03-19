import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import DriveModule from '../../../app/modules/drive/DriveModule';
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
const mockFiles = [
  {
    id: 'file1',
    name: 'Document.pdf',
    mimeType: 'application/pdf',
    createdTime: '2023-08-15T14:30:00Z',
    modifiedTime: '2023-08-16T10:15:00Z',
    size: '1024000',
    webViewLink: 'https://drive.google.com/file/d/file1/view',
    iconLink: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
    owners: [{ displayName: 'John Doe', emailAddress: 'john@example.com' }],
    shared: false,
  },
  {
    id: 'file2',
    name: 'Image.jpg',
    mimeType: 'image/jpeg',
    createdTime: '2023-08-10T09:45:00Z',
    modifiedTime: '2023-08-10T09:45:00Z',
    size: '2048000',
    webViewLink: 'https://drive.google.com/file/d/file2/view',
    iconLink: 'https://drive-thirdparty.googleusercontent.com/16/type/image/jpeg',
    owners: [{ displayName: 'Jane Smith', emailAddress: 'jane@example.com' }],
    shared: true,
  },
];

const mockFolders = [
  {
    id: 'folder1',
    name: 'Documents',
    path: [],
  },
  {
    id: 'folder2',
    name: 'Images',
    path: [],
  },
];

describe('DriveModule', () => {
  beforeEach(() => {
    // Réinitialiser les mocks
    jest.clearAllMocks();
    
    // Simuler la réponse pour récupérer les fichiers et dossiers
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/modules/drive/files') {
        return Promise.resolve({
          data: {
            files: mockFiles,
            folders: mockFolders,
          },
        });
      } else if (url.includes('/api/modules/drive/folder/')) {
        return Promise.resolve({
          data: {
            id: 'folder1',
            name: 'Documents',
            path: [{ id: 'root', name: 'Mon Drive' }],
          },
        });
      }
      
      return Promise.reject(new Error('URL non gérée dans le mock'));
    });
    
    // Simuler la réponse pour l'analyse des fichiers
    mockedAxios.post.mockResolvedValue({
      data: {
        success: true,
        analysis: 'Analyse des fichiers: 2 fichiers trouvés. Document PDF contenant du texte et une image JPG.',
      },
    });
  });

  test('Charge correctement les fichiers et dossiers', async () => {
    render(<DriveModule isVisible={true} />);
    
    // Vérifier que la requête a été effectuée
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/modules/drive/files', {
      params: { folderId: 'root' },
    });
    
    // Attendre que les fichiers et dossiers soient affichés
    await waitFor(() => {
      expect(screen.getByText('Document.pdf')).toBeInTheDocument();
      expect(screen.getByText('Image.jpg')).toBeInTheDocument();
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
    });
  });

  test('Permet de naviguer dans les dossiers', async () => {
    render(<DriveModule isVisible={true} />);
    
    // Attendre que les dossiers soient chargés
    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
    
    // Cliquer sur un dossier
    const folder = screen.getByText('Documents');
    fireEvent.click(folder);
    
    // Vérifier que la requête a été effectuée avec le bon ID de dossier
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/modules/drive/files', {
      params: { folderId: 'folder1' },
    });
    
    // Vérifier que les détails du dossier ont été récupérés
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/modules/drive/folder/folder1');
  });

  test('Permet de rechercher des fichiers', async () => {
    render(<DriveModule isVisible={true} />);
    
    // Attendre que les fichiers soient chargés
    await waitFor(() => {
      expect(screen.getByText('Document.pdf')).toBeInTheDocument();
    });
    
    // Entrer une requête de recherche
    const searchInput = screen.getByPlaceholderText('Rechercher des fichiers...');
    fireEvent.change(searchInput, { target: { value: 'document' } });
    
    // Cliquer sur le bouton de recherche
    const searchButton = screen.getByText('Rechercher');
    fireEvent.click(searchButton);
    
    // Vérifier que la requête a été effectuée avec la bonne requête
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/modules/drive/search', {
      params: { query: 'document' },
    });
  });

  test('Permet d\'analyser les fichiers sélectionnés', async () => {
    render(<DriveModule isVisible={true} />);
    
    // Attendre que les fichiers soient chargés
    await waitFor(() => {
      expect(screen.getByText('Document.pdf')).toBeInTheDocument();
    });
    
    // Sélectionner un fichier
    const checkbox = screen.getAllByRole('checkbox')[1]; // Premier fichier dans la liste
    fireEvent.click(checkbox);
    
    // Cliquer sur le bouton d'analyse
    const analyzeButton = screen.getByText('Analyser les fichiers sélectionnés');
    fireEvent.click(analyzeButton);
    
    // Vérifier que la requête d'analyse a été effectuée
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/modules/drive/analyze', {
      fileIds: ['file1'],
    });
    
    // Vérifier que le résultat de l'analyse est affiché
    await waitFor(() => {
      expect(screen.getByText(/Analyse des fichiers: 2 fichiers trouvés/)).toBeInTheDocument();
    });
  });
}); 