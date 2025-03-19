'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAssistant } from '../../context/AssistantContext';
import { useModules } from '../../context/ModulesContext';
import { act } from 'react-dom/test-utils';

interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  isRead: boolean;
  isImportant: boolean;
  labels: string[];
}

interface GmailModuleProps {
  isVisible: boolean;
}

const GmailModule: React.FC<GmailModuleProps> = ({ isVisible }) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'important'>('all');
  
  const { addMemory } = useAssistant();
  const { isModuleEnabled } = useModules();

  const fetchEmails = async () => {
    if (!isModuleEnabled('gmail')) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Appel API à l'endpoint de récupération des emails
      const response = await axios.get('/api/modules/gmail/emails', {
        params: { filter: filterType }
      });
      
      setEmails(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error('Erreur lors de la récupération des emails:', err);
      setError('Impossible de récupérer les emails. Veuillez vérifier votre connexion et vos autorisations.');
      setIsLoading(false);
    }
  };

  // Charger les emails au montage du composant et lors du changement de filtre
  useEffect(() => {
    let isMounted = true;
    
    const loadEmails = async () => {
      if (isVisible && isModuleEnabled('gmail')) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Appel API à l'endpoint de récupération des emails
          const response = await axios.get('/api/modules/gmail/emails', {
            params: { filter: filterType }
          });
          
          // Vérifier si le composant est toujours monté avant de mettre à jour l'état
          if (isMounted) {
            setEmails(response.data);
            setIsLoading(false);
          }
        } catch (err) {
          console.error('Erreur lors de la récupération des emails:', err);
          
          // Vérifier si le composant est toujours monté avant de mettre à jour l'état
          if (isMounted) {
            setError('Impossible de récupérer les emails. Veuillez vérifier votre connexion et vos autorisations.');
            setIsLoading(false);
          }
        }
      }
    };
    
    loadEmails();
    
    // Nettoyer l'effet
    return () => {
      isMounted = false;
    };
  }, [isVisible, filterType, isModuleEnabled]);

  const analyzeEmails = async () => {
    if (selectedEmailIds.length === 0) {
      setError('Veuillez sélectionner au moins un email à analyser.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      
      // Récupérer les emails sélectionnés
      const selectedEmails = emails.filter(email => selectedEmailIds.includes(email.id));
      
      // Appel API à l'endpoint d'analyse des emails
      const response = await axios.post('/api/modules/gmail/analyze', {
        emails: selectedEmails
      });
      
      const result = response.data.analysis;
      setAnalysisResult(result);
      
      // Ajouter l'analyse à la mémoire de l'assistant
      addMemory({
        id: `gmail-analysis-${Date.now()}`,
        type: 'email-analysis',
        content: result,
        source: 'gmail',
        timestamp: new Date().toISOString(),
        metadata: {
          emailCount: selectedEmails.length,
          emailSubjects: selectedEmails.map(e => e.subject)
        }
      });
    } catch (err) {
      console.error('Erreur lors de l\'analyse des emails:', err);
      setError('Impossible d\'analyser les emails. Veuillez réessayer.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmailIds(prev => 
      prev.includes(emailId)
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  const markAsRead = async (emailIds: string[]) => {
    try {
      await axios.post('/api/modules/gmail/mark-read', { emailIds });
      
      // Mettre à jour l'état local
      setEmails(prev => 
        prev.map(email => 
          emailIds.includes(email.id) 
            ? { ...email, isRead: true } 
            : email
        )
      );
    } catch (err) {
      console.error('Erreur lors du marquage des emails comme lus:', err);
      setError('Impossible de marquer les emails comme lus.');
    }
  };

  const toggleImportant = async (emailId: string) => {
    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;
      
      const newImportantState = !email.isImportant;
      
      await axios.post('/api/modules/gmail/toggle-important', { 
        emailId, 
        important: newImportantState 
      });
      
      // Mettre à jour l'état local
      setEmails(prev => 
        prev.map(email => 
          email.id === emailId 
            ? { ...email, isImportant: newImportantState } 
            : email
        )
      );
    } catch (err) {
      console.error('Erreur lors du changement d\'importance:', err);
      setError('Impossible de modifier l\'importance de l\'email.');
    }
  };

  if (!isVisible) return null;
  
  if (!isModuleEnabled('gmail')) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Module Gmail</h2>
        <p className="text-gray-600">
          Ce module est actuellement désactivé. Activez-le dans les paramètres pour accéder à vos emails.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Analyse d'emails Gmail</h2>
      
      <div className="mb-4 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded ${
              filterType === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterType('unread')}
            className={`px-3 py-1 rounded ${
              filterType === 'unread' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Non lus
          </button>
          <button
            onClick={() => setFilterType('important')}
            className={`px-3 py-1 rounded ${
              filterType === 'important' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Importants
          </button>
        </div>
        
        <button
          onClick={fetchEmails}
          disabled={isLoading}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          Actualiser
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {emails.length === 0 ? (
            <p className="text-gray-600 py-4">Aucun email trouvé.</p>
          ) : (
            <div className="mb-4 max-h-96 overflow-y-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-2 py-3 text-left">
                      <input
                        type="checkbox"
                        onChange={() => {
                          if (selectedEmailIds.length === emails.length) {
                            setSelectedEmailIds([]);
                          } else {
                            setSelectedEmailIds(emails.map(e => e.id));
                          }
                        }}
                        checked={selectedEmailIds.length === emails.length && emails.length > 0}
                        className="rounded"
                      />
                    </th>
                    <th className="w-10 px-2 py-3 text-left"></th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      De
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Sujet
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {emails.map((email) => (
                    <tr 
                      key={email.id} 
                      className={`hover:bg-gray-50 ${!email.isRead ? 'font-semibold bg-blue-50' : ''}`}
                    >
                      <td className="px-2 py-3">
                        <input
                          type="checkbox"
                          checked={selectedEmailIds.includes(email.id)}
                          onChange={() => toggleEmailSelection(email.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => toggleImportant(email.id)}
                          className="text-yellow-500 hover:text-yellow-600"
                          title={email.isImportant ? "Retirer l'importance" : "Marquer comme important"}
                        >
                          {email.isImportant ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">{email.from}</td>
                      <td className="px-4 py-3 text-sm">{email.subject}</td>
                      <td className="px-4 py-3 text-sm">{new Date(email.date).toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      
      <div className="flex space-x-2 mb-4">
        <button
          onClick={analyzeEmails}
          disabled={selectedEmailIds.length === 0 || isAnalyzing}
          className={`px-4 py-2 rounded ${
            selectedEmailIds.length === 0 || isAnalyzing
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyse en cours...
            </span>
          ) : (
            'Analyser les emails sélectionnés'
          )}
        </button>
        
        {selectedEmailIds.length > 0 && (
          <button
            onClick={() => markAsRead(selectedEmailIds)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Marquer comme lu
          </button>
        )}
      </div>
      
      {analysisResult && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium mb-2">Résultat de l'analyse :</h3>
          <p className="whitespace-pre-line">{analysisResult}</p>
        </div>
      )}
    </div>
  );
};

export default GmailModule; 