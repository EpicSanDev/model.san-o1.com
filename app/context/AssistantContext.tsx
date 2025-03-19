import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface Memory {
  id: string;
  content: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AssistantContextType {
  messages: Message[];
  isListening: boolean;
  memories: Memory[];
  transcript: string;
  isProcessing: boolean;
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => void;
  toggleListening: () => void;
  clearMessages: () => void;
  addMemory: (content: string, type: string) => Promise<void>;
  getRelevantMemories: (query: string) => Promise<Memory[]>;
  processTranscript: (transcript: string) => Promise<void>;
  setTranscript: (text: string) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Charger les messages et la mémoire au démarrage
  useEffect(() => {
    // Simulation du chargement des messages précédents (à remplacer par un appel API)
    const initialMessages: Message[] = [
      {
        role: 'system',
        content: 'Je suis votre assistant personnel IA. Comment puis-je vous aider aujourd\'hui?',
        timestamp: new Date(),
      },
    ];
    setMessages(initialMessages);

    // Simulation du chargement des mémoires (à remplacer par un appel API)
    const fetchMemories = async () => {
      try {
        // Remplacer par un appel API réel
        const response = await fetch('/api/memories');
        if (response.ok) {
          const data = await response.json();
          setMemories(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des mémoires:', error);
      }
    };

    fetchMemories();
  }, []);

  // Ajouter un message à la conversation
  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    const newMessage: Message = {
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  // Basculer l'état d'écoute
  const toggleListening = () => {
    setIsListening((prev) => !prev);
  };

  // Effacer tous les messages
  const clearMessages = () => {
    setMessages([]);
  };

  // Ajouter une information à la mémoire
  const addMemory = async (content: string, type: string = 'general') => {
    try {
      // Remplacer par un appel API réel
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, type }),
      });

      if (response.ok) {
        const newMemory = await response.json();
        setMemories((prevMemories) => [...prevMemories, newMemory]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la mémoire:', error);
    }
  };

  // Récupérer les mémoires pertinentes pour une requête
  const getRelevantMemories = async (query: string): Promise<Memory[]> => {
    try {
      // Remplacer par un appel API réel
      const response = await fetch(`/api/memories/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la recherche dans la mémoire:', error);
      return [];
    }
  };

  // Traiter le texte transcrit
  const processTranscript = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    
    // Ajouter le message de l'utilisateur
    addMessage('user', text);
    
    try {
      // Remplacer par un appel API réel à OpenAI
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: text }
          ],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        addMessage('assistant', data.response);
        
        // Stocker des informations importantes dans la mémoire si nécessaire
        if (data.shouldRemember) {
          await addMemory(data.memoryContent || text, data.memoryType || 'general');
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement de la requête:', error);
      addMessage('assistant', 'Désolé, j\'ai rencontré une erreur lors du traitement de votre demande.');
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  return (
    <AssistantContext.Provider
      value={{
        messages,
        isListening,
        memories,
        transcript,
        isProcessing,
        addMessage,
        toggleListening,
        clearMessages,
        addMemory,
        getRelevantMemories,
        processTranscript,
        setTranscript,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error('useAssistant doit être utilisé dans un AssistantProvider');
  }
  return context;
}; 