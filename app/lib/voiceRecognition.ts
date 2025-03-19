import { useEffect, useState, useCallback, useRef } from 'react';

// Interface pour les options de configuration de la reconnaissance vocale
export interface VoiceRecognitionOptions {
  continuous?: boolean;      // Mode d'écoute continue
  interimResults?: boolean;  // Résultats intermédiaires pendant la parole
  language?: string;         // Langue pour la reconnaissance
  activationKeyword?: string; // Mot-clé d'activation (ex: "Assistant")
  sensitivity?: number;      // Sensibilité de détection du mot-clé (0-1)
  silenceThreshold?: number; // Seuil de silence en millisecondes avant de considérer que l'utilisateur a fini de parler
}

// Interface pour le hook de reconnaissance vocale
export interface UseVoiceRecognitionReturn {
  transcript: string;          // Texte transcrit
  isListening: boolean;        // État d'écoute
  isSpeaking: boolean;         // Indique si l'utilisateur est en train de parler
  isProcessing: boolean;       // Indique si l'assistant traite la demande
  confidence: number;          // Niveau de confiance dans la transcription (0-1)
  startListening: () => void;  // Démarrer l'écoute
  stopListening: () => void;   // Arrêter l'écoute
  toggleListening: () => void; // Basculer l'écoute
  resetTranscript: () => void; // Réinitialiser la transcription
  setTranscript: (text: string) => void; // Modifier la transcription manuellement
}

// Service pour la gestion de la reconnaissance vocale
export class VoiceRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isKeywordDetected: boolean = false;
  private lastActivityTimestamp: number = 0;
  private silenceTimer: NodeJS.Timeout | null = null;
  private options: VoiceRecognitionOptions;
  private onTranscriptChange: (transcript: string) => void;
  private onStatusChange: (status: { isListening: boolean, isSpeaking: boolean, isKeywordDetected: boolean }) => void;
  private onSilenceDetected: () => void;
  private confidenceLevel: number = 0;

  constructor(
    options: VoiceRecognitionOptions,
    onTranscriptChange: (transcript: string) => void,
    onStatusChange: (status: { isListening: boolean, isSpeaking: boolean, isKeywordDetected: boolean }) => void,
    onSilenceDetected: () => void
  ) {
    this.options = {
      continuous: true,
      interimResults: true,
      language: 'fr-FR',
      activationKeyword: 'assistant',
      sensitivity: 0.7,
      silenceThreshold: 1500,
      ...options
    };

    this.onTranscriptChange = onTranscriptChange;
    this.onStatusChange = onStatusChange;
    this.onSilenceDetected = onSilenceDetected;

    // Initialiser la reconnaissance vocale si disponible dans le navigateur
    if (typeof window !== 'undefined') {
      this.initializeRecognition();
    }
  }

  // Initialiser le système de reconnaissance vocale
  private initializeRecognition(): void {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      // Configurer les options
      this.recognition.continuous = this.options.continuous || true;
      this.recognition.interimResults = this.options.interimResults || true;
      this.recognition.lang = this.options.language || 'fr-FR';

      // Gérer les événements
      this.recognition.onstart = this.handleStart.bind(this);
      this.recognition.onend = this.handleEnd.bind(this);
      this.recognition.onresult = this.handleResult.bind(this);
      this.recognition.onerror = this.handleError.bind(this);
    } else {
      console.error('La reconnaissance vocale n\'est pas prise en charge par ce navigateur.');
    }
  }

  // Démarrer l'écoute
  public start(): void {
    if (this.recognition) {
      try {
        this.recognition.start();
        this.lastActivityTimestamp = Date.now();
      } catch (error) {
        console.error('Erreur au démarrage de la reconnaissance vocale:', error);
      }
    }
  }

  // Arrêter l'écoute
  public stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.resetSilenceTimer();
      } catch (error) {
        console.error('Erreur à l\'arrêt de la reconnaissance vocale:', error);
      }
    }
  }

  // Réinitialiser la transcription
  public resetTranscript(): void {
    this.onTranscriptChange('');
  }

  // Gérer le début de la reconnaissance
  private handleStart(): void {
    this.onStatusChange({ isListening: true, isSpeaking: false, isKeywordDetected: this.isKeywordDetected });
  }

  // Gérer la fin de la reconnaissance
  private handleEnd(): void {
    // Redémarrer automatiquement si en mode continu et que le mot-clé a été détecté
    if (this.options.continuous && this.isKeywordDetected) {
      this.start();
    } else {
      this.onStatusChange({ isListening: false, isSpeaking: false, isKeywordDetected: this.isKeywordDetected });
    }
  }

  // Gérer les résultats de la reconnaissance
  private handleResult(event: SpeechRecognitionEvent): void {
    let finalTranscript = '';
    let interimTranscript = '';
    let confidence = 0;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.trim().toLowerCase();
      confidence = event.results[i][0].confidence;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    this.confidenceLevel = confidence;
    const currentTranscript = finalTranscript || interimTranscript;

    // Détecter le mot-clé d'activation si défini
    if (this.options.activationKeyword && !this.isKeywordDetected) {
      const keyword = this.options.activationKeyword.toLowerCase();
      
      if (currentTranscript.includes(keyword) && confidence >= (this.options.sensitivity || 0.7)) {
        this.isKeywordDetected = true;
        this.onStatusChange({ isListening: true, isSpeaking: true, isKeywordDetected: true });
        this.onTranscriptChange(''); // Réinitialiser pour ne garder que ce qui suit le mot-clé
        return;
      }
    }

    // Traiter les résultats uniquement si le mot-clé a été détecté ou si aucun mot-clé n'est défini
    if (this.isKeywordDetected || !this.options.activationKeyword) {
      this.lastActivityTimestamp = Date.now();
      this.onTranscriptChange(currentTranscript);
      this.onStatusChange({ isListening: true, isSpeaking: true, isKeywordDetected: this.isKeywordDetected });
      this.resetSilenceTimer();
      this.startSilenceDetection();
    }
  }

  // Gérer les erreurs de reconnaissance
  private handleError(event: SpeechRecognitionErrorEvent): void {
    console.error('Erreur de reconnaissance vocale:', event.error);
    
    // Redémarrer si une erreur temporaire se produit
    if (event.error === 'network' || event.error === 'aborted') {
      setTimeout(() => this.start(), 1000);
    } else {
      this.onStatusChange({ isListening: false, isSpeaking: false, isKeywordDetected: this.isKeywordDetected });
    }
  }

  // Démarrer la détection de silence
  private startSilenceDetection(): void {
    if (this.silenceTimer === null) {
      this.silenceTimer = setTimeout(() => {
        const currentTime = Date.now();
        const timeSinceLastActivity = currentTime - this.lastActivityTimestamp;
        
        if (timeSinceLastActivity >= (this.options.silenceThreshold || 1500)) {
          // L'utilisateur a arrêté de parler
          this.onStatusChange({ isListening: true, isSpeaking: false, isKeywordDetected: this.isKeywordDetected });
          this.onSilenceDetected();
          this.isKeywordDetected = false; // Réinitialiser pour la prochaine détection
        }
        
        this.silenceTimer = null;
      }, this.options.silenceThreshold || 1500);
    }
  }

  // Réinitialiser le timer de détection de silence
  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  // Obtenir le niveau de confiance actuel
  public getConfidence(): number {
    return this.confidenceLevel;
  }
}

// Hook personnalisé pour utiliser la reconnaissance vocale dans les composants React
export function useVoiceRecognition(options: VoiceRecognitionOptions = {}): UseVoiceRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isKeywordDetected, setIsKeywordDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);
  
  const recognitionServiceRef = useRef<VoiceRecognitionService | null>(null);

  // Initialiser le service de reconnaissance vocale
  useEffect(() => {
    if (typeof window !== 'undefined') {
      recognitionServiceRef.current = new VoiceRecognitionService(
        options,
        (newTranscript) => setTranscript(newTranscript),
        (status) => {
          setIsListening(status.isListening);
          setIsSpeaking(status.isSpeaking);
          setIsKeywordDetected(status.isKeywordDetected);
        },
        () => {
          // Silence détecté, l'utilisateur a fini de parler
          setIsProcessing(true);
          
          // Réinitialiser après traitement (simulé ici avec un délai)
          setTimeout(() => {
            setIsProcessing(false);
            setTranscript('');
          }, 500);
        }
      );

      // Nettoyer à la destruction du composant
      return () => {
        if (recognitionServiceRef.current) {
          recognitionServiceRef.current.stop();
        }
      };
    }
  }, [options]);

  // Mettre à jour le niveau de confiance périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      if (recognitionServiceRef.current && isListening) {
        setConfidence(recognitionServiceRef.current.getConfidence());
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [isListening]);

  // Fonctions pour contrôler la reconnaissance vocale
  const startListening = useCallback(() => {
    if (recognitionServiceRef.current) {
      recognitionServiceRef.current.start();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionServiceRef.current) {
      recognitionServiceRef.current.stop();
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    if (recognitionServiceRef.current) {
      recognitionServiceRef.current.resetTranscript();
    }
  }, []);

  return {
    transcript,
    isListening,
    isSpeaking,
    isProcessing,
    confidence,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    setTranscript
  };
}

// Augmenter la fenêtre avec les types de reconnaissance vocale pour TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
} 