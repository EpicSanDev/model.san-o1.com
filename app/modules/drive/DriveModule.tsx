'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAssistant } from '../../context/AssistantContext';
import { useModules } from '../../context/ModulesContext';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  webViewLink: string;
  iconLink: string;
  owners: { displayName: string; emailAddress: string }[];
  shared: boolean;
}

interface DriveFolder {
  id: string;
  name: string;
  path: string[];
}

interface DriveModuleProps {
  isVisible: boolean;
}

const DriveModule: React.FC<DriveModuleProps> = ({ isVisible }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [folderPath, setFolderPath] = useState<DriveFolder[]>([{ id: 'root', name: 'Mon Drive', path: [] }]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  
  const { addMemory } = useAssistant();
  const { isModuleEnabled } = useModules();

  // Charger les fichiers et dossiers
  const fetchFilesAndFolders = async (folderId = 'root') => {
    if (!isModuleEnabled('drive')) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Appel à l'API pour récupérer les fichiers et dossiers
      const response = await axios.get('/api/modules/drive/files', {
        params: { folderId }
      });
      
      // Mettre à jour l'état en une seule mise à jour groupée
      const updatedFiles = response.data.files || [];
      const updatedFolders = response.data.folders || [];
      
      setFiles(updatedFiles);
      setFolders(updatedFolders);
      setCurrentFolder(folderId);
      
      // Mettre à jour le chemin de dossier
      if (folderId !== 'root') {
        const folderDetails = await axios.get(`/api/modules/drive/folder/${folderId}`);
        const newFolder: DriveFolder = {
          id: folderId,
          name: folderDetails.data.name,
          path: [...folderPath.map(f => f.id)]
        };
        
        // Vérifier si le dossier est déjà dans le chemin (navigation en arrière)
        const existingIndex = folderPath.findIndex(f => f.id === folderId);
        if (existingIndex !== -1) {
          // Navigation en arrière, tronquer le chemin
          setFolderPath(folderPath.slice(0, existingIndex + 1));
        } else {
          // Nouveau dossier, ajouter au chemin
          setFolderPath([...folderPath, newFolder]);
        }
      } else {
        // Retour à la racine
        setFolderPath([{ id: 'root', name: 'Mon Drive', path: [] }]);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des fichiers:', err);
      setError('Impossible de récupérer les fichiers. Veuillez vérifier votre connexion et vos autorisations.');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les fichiers et dossiers au montage du composant
  useEffect(() => {
    let isMounted = true;
    
    const loadFiles = async () => {
      if (isVisible && isModuleEnabled('drive')) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Appel à l'API pour récupérer les fichiers et dossiers
          const response = await axios.get('/api/modules/drive/files', {
            params: { folderId: currentFolder }
          });
          
          // Vérifier si le composant est toujours monté avant de mettre à jour l'état
          if (isMounted) {
            const updatedFiles = response.data.files || [];
            const updatedFolders = response.data.folders || [];
            
            setFiles(updatedFiles);
            setFolders(updatedFolders);
            setIsLoading(false);
          }
        } catch (err) {
          if (isMounted) {
            console.error('Erreur lors de la récupération des fichiers:', err);
            setError('Impossible de récupérer les fichiers. Veuillez vérifier votre connexion et vos autorisations.');
            setIsLoading(false);
          }
        }
      }
    };
    
    loadFiles();
    
    // Nettoyer l'effet
    return () => {
      isMounted = false;
    };
  }, [isVisible, currentFolder, isModuleEnabled]);

  // Naviguer vers un dossier
  const navigateToFolder = (folderId: string) => {
    fetchFilesAndFolders(folderId);
  };

  // Naviguer vers le dossier parent
  const navigateToParent = async () => {
    if (folderPath.length <= 1) return;
    
    const parentFolder = folderPath[folderPath.length - 2];
    navigateToFolder(parentFolder.id);
  };

  // Rechercher des fichiers
  const searchFiles = async () => {
    if (!searchQuery.trim()) {
      fetchFilesAndFolders(currentFolder);
      return;
    }
    
    try {
      setIsSearching(true);
      setError(null);
      
      const response = await axios.get('/api/modules/drive/search', {
        params: { query: searchQuery }
      });
      
      setFiles(response.data.files || []);
      setFolders(response.data.folders || []);
    } catch (err) {
      console.error('Erreur lors de la recherche de fichiers:', err);
      setError('La recherche a échoué. Veuillez réessayer.');
    } finally {
      setIsSearching(false);
    }
  };

  // Télécharger un fichier
  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      setError(null);
      
      const response = await axios.get(`/api/modules/drive/download/${fileId}`, {
        responseType: 'blob'
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erreur lors du téléchargement du fichier:', err);
      setError('Le téléchargement a échoué. Veuillez réessayer.');
    }
  };

  // Téléverser un fichier
  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setError(null);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('folderId', currentFolder);
      
      await axios.post('/api/modules/drive/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        }
      });
      
      // Actualiser la liste des fichiers
      fetchFilesAndFolders(currentFolder);
    } catch (err) {
      console.error('Erreur lors du téléversement du fichier:', err);
      setError('Le téléversement a échoué. Veuillez réessayer.');
    } finally {
      setUploadProgress(null);
    }
  };

  // Analyser les fichiers
  const analyzeFiles = async () => {
    if (selectedFileIds.length === 0) {
      setError('Veuillez sélectionner au moins un fichier à analyser.');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      
      // Récupérer les fichiers sélectionnés
      const selectedFiles = files.filter(file => selectedFileIds.includes(file.id));
      
      // Appel à l'API pour analyser les fichiers
      const response = await axios.post('/api/modules/drive/analyze', {
        fileIds: selectedFileIds
      });
      
      const result = response.data.analysis;
      setAnalysisResult(result);
      
      // Ajouter l'analyse à la mémoire de l'assistant
      addMemory({
        id: `drive-analysis-${Date.now()}`,
        type: 'file-analysis',
        content: result,
        source: 'drive',
        timestamp: new Date().toISOString(),
        metadata: {
          fileCount: selectedFiles.length,
          fileNames: selectedFiles.map(f => f.name)
        }
      });
    } catch (err) {
      console.error('Erreur lors de l\'analyse des fichiers:', err);
      setError('Impossible d\'analyser les fichiers. Veuillez réessayer.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Gérer la sélection des fichiers
  const toggleFileSelection = (fileId: string) => {
    if (selectedFileIds.includes(fileId)) {
      setSelectedFileIds(selectedFileIds.filter(id => id !== fileId));
    } else {
      setSelectedFileIds([...selectedFileIds, fileId]);
    }
  };

  if (!isVisible || !isModuleEnabled('drive')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-semibold mb-4">Google Drive</h2>
      
      {/* Barre de navigation */}
      <div className="flex items-center mb-4">
        <button 
          onClick={() => navigateToFolder('root')}
          className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-sm hover:bg-blue-100"
        >
          Accueil
        </button>
        
        {folderPath.length > 1 && (
          <button 
            onClick={navigateToParent}
            className="ml-2 bg-blue-50 text-blue-600 px-2 py-1 rounded text-sm hover:bg-blue-100"
          >
            Retour
          </button>
        )}
        
        <div className="flex items-center ml-4">
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              {index > 0 && <span className="mx-1 text-gray-400">/</span>}
              <button 
                onClick={() => navigateToFolder(folder.id)}
                className="text-sm text-blue-600 hover:underline"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Barre de recherche */}
      <div className="flex mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher des fichiers..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-l text-sm"
        />
        <button
          onClick={searchFiles}
          disabled={isSearching}
          className="bg-blue-600 text-white px-4 py-2 rounded-r text-sm hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSearching ? 'Recherche...' : 'Rechercher'}
        </button>
      </div>
      
      {/* Actions */}
      <div className="flex mb-4">
        <label className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 cursor-pointer">
          Téléverser un fichier
          <input
            type="file"
            onChange={uploadFile}
            className="hidden"
          />
        </label>
        
        {selectedFileIds.length > 0 && (
          <button
            onClick={analyzeFiles}
            disabled={isAnalyzing}
            className="ml-2 bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:bg-purple-300"
          >
            {isAnalyzing ? 'Analyse en cours...' : 'Analyser les fichiers sélectionnés'}
          </button>
        )}
      </div>
      
      {/* Progression du téléversement */}
      {uploadProgress !== null && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-green-600 rounded"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">Téléversement: {uploadProgress}%</p>
        </div>
      )}
      
      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      
      {/* Résultat d'analyse */}
      {analysisResult && (
        <div className="bg-purple-50 p-3 rounded mb-4">
          <h3 className="text-purple-800 font-medium mb-2 text-sm">Résultat de l'analyse:</h3>
          <p className="text-sm">{analysisResult}</p>
        </div>
      )}
      
      {/* Liste des dossiers */}
      {folders.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Dossiers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.id)}
                className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
              >
                <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm truncate">{folder.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Liste des fichiers */}
      {isLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Chargement...</p>
        </div>
      ) : files.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium mb-2">Fichiers</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedFileIds.length > 0 && selectedFileIds.length === files.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFileIds(files.map(file => file.id));
                        } else {
                          setSelectedFileIds([]);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriétaire
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modifié le
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedFileIds.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <img src={file.iconLink} alt="" className="h-5 w-5 mr-2" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      {file.owners?.[0]?.displayName || 'Inconnu'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      {new Date(file.modifiedTime).toLocaleString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Ouvrir
                        </a>
                        <button
                          onClick={() => downloadFile(file.id, file.name)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Télécharger
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500">Aucun fichier trouvé.</p>
        </div>
      )}
    </div>
  );
};

export default DriveModule; 