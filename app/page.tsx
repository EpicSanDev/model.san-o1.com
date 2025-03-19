'use client';

import { useState, useEffect } from 'react';
import { useAssistant } from './context/AssistantContext';
import MessagesList from './components/MessagesList';
import VoiceRecorder from './components/VoiceRecorder';
import MemoryViewer from './components/MemoryViewer';
import Header from './components/Header';

export default function Home() {
  const {
    messages,
    isListening,
    memories,
    transcript,
    isProcessing,
    toggleListening,
    processTranscript,
    setTranscript,
  } = useAssistant();

  const [activeTab, setActiveTab] = useState<'chat' | 'memory'>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Traiter le transcript lorsqu'il devient inactif (utilisateur arrête de parler)
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (transcript && !isProcessing) {
      // Réinitialiser le timer d'inactivité
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      setLastActivity(Date.now());
      
      // Configurer un nouveau timer qui sera déclenché après 1.5 seconde d'inactivité
      const timer = setTimeout(() => {
        if (transcript.trim()) {
          processTranscript(transcript);
        }
      }, 1500);
      
      setInactivityTimer(timer);
    }
    
    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, [transcript, isProcessing]);

  // Gérer la soumission manuelle du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transcript.trim() && !isProcessing) {
      processTranscript(transcript);
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        setInactivityTimer(null);
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
      />
      
      <div className="flex-1 container mx-auto px-4 py-6">
        {activeTab === 'chat' ? (
          <div className="flex flex-col h-full">
            <MessagesList messages={messages} />
            
            <div className="mt-auto pt-4">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Tapez votre message ou parlez..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!transcript.trim() || isProcessing}
                >
                  Envoyer
                </button>
                <VoiceRecorder
                  isListening={isListening}
                  toggleListening={toggleListening}
                  isProcessing={isProcessing}
                />
              </form>
              {isProcessing && (
                <p className="text-sm text-gray-500 mt-2">Traitement en cours...</p>
              )}
              {isListening && (
                <p className="text-sm text-green-500 mt-2 animate-pulse">En écoute...</p>
              )}
            </div>
          </div>
        ) : (
          <MemoryViewer memories={memories} />
        )}
      </div>
    </main>
  );
} 