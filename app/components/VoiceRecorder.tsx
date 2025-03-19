'use client';

import { useState, useEffect } from 'react';
import { useVoiceRecognition, VoiceRecognitionOptions } from '../lib/voiceRecognition';
import { useAssistant } from '../context/AssistantContext';

interface VoiceRecorderProps {
  isListening: boolean;
  toggleListening: () => void;
  isProcessing: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isListening,
  toggleListening,
  isProcessing,
}) => {
  const { processTranscript, transcript, setTranscript } = useAssistant();
  const [recognitionSettings, setRecognitionSettings] = useState<VoiceRecognitionOptions>({
    continuous: true,
    interimResults: true,
    language: 'fr-FR',
    activationKeyword: 'assistant',
    sensitivity: 0.7,
    silenceThreshold: 1500,
  });
  
  const {
    transcript: recognitionTranscript,
    isListening: isRecognitionListening,
    isSpeaking,
    confidence,
    startListening,
    stopListening,
    toggleListening: toggleRecognitionListening
  } = useVoiceRecognition(recognitionSettings);

  // Synchroniser l'état d'écoute
  useEffect(() => {
    if (isListening !== isRecognitionListening) {
      toggleRecognitionListening();
    }
  }, [isListening, isRecognitionListening, toggleRecognitionListening]);

  // Mettre à jour le transcript dans le contexte global
  useEffect(() => {
    if (recognitionTranscript) {
      setTranscript(recognitionTranscript);
    }
  }, [recognitionTranscript, setTranscript]);

  // Traiter le transcript lorsque l'utilisateur a fini de parler
  useEffect(() => {
    if (isSpeaking === false && transcript.trim() && !isProcessing) {
      // Ajouter un court délai pour s'assurer que le transcript est complet
      const timer = setTimeout(() => {
        processTranscript(transcript);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, transcript, isProcessing, processTranscript]);

  // Animation du microphone
  const microphoneClasses = `flex items-center justify-center p-3 rounded-full ${
    isListening 
      ? 'bg-green-500 animate-pulse' 
      : isProcessing 
        ? 'bg-yellow-500' 
        : 'bg-gray-300'
  }`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleListening}
        className={microphoneClasses}
        disabled={isProcessing}
        title={isListening ? 'Arrêter l\'écoute' : 'Démarrer l\'écoute'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-white"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        </svg>
      </button>
      
      {confidence > 0 && isListening && (
        <div className="absolute -bottom-2 -right-2">
          <span 
            className={`text-xs px-2 py-1 rounded-full ${
              confidence > 0.8 
                ? 'bg-green-500 text-white' 
                : confidence > 0.5 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-red-500 text-white'
            }`}
            title="Niveau de confiance de la reconnaissance vocale"
          >
            {Math.round(confidence * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder; 