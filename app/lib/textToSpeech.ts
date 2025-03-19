/**
 * Module de synthèse vocale (TTS) utilisant l'API Web Speech et/ou OpenAI
 */

// Types pour les options de TTS
export interface TTSOptions {
  voice?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  useOpenAI?: boolean;
  gender?: 'male' | 'female' | 'neutral';
  language?: string;
}

// Type pour les informations d'une voix
export interface VoiceInfo {
  id: string;
  name: string;
  lang: string;
  gender?: string;
  isLocal: boolean;
  isDefault?: boolean;
}

// Classe principale de synthèse vocale
export class TextToSpeech {
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private defaultOptions: TTSOptions = {
    voice: '',
    pitch: 1,
    rate: 1,
    volume: 1,
    useOpenAI: false,
    gender: 'neutral',
    language: 'fr-FR'
  };
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private isSpeaking: boolean = false;
  private onEndCallbacks: Array<() => void> = [];
  private onStartCallbacks: Array<() => void> = [];
  private queue: string[] = [];
  private isProcessingQueue: boolean = false;

  constructor(options?: Partial<TTSOptions>) {
    this.defaultOptions = {
      ...this.defaultOptions,
      ...options
    };

    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      this.initVoices();
      
      // Initialiser l'AudioContext pour l'analyse audio
      this.initAudioContext();
    }
  }

  // Initialiser la liste des voix disponibles
  private initVoices(): void {
    if (!this.synthesis) return;

    // Fonction pour charger les voix
    const loadVoices = () => {
      this.voices = this.synthesis?.getVoices() || [];
      
      // Si aucune voix sélectionnée, mais qu'une langue est définie, choisir une voix par défaut
      if (!this.defaultOptions.voice && this.defaultOptions.language) {
        const matchingVoice = this.voices.find(
          voice => voice.lang.startsWith(this.defaultOptions.language!)
        );
        
        if (matchingVoice) {
          this.defaultOptions.voice = matchingVoice.name;
        }
      }
    };

    // Chargement initial des voix
    loadVoices();

    // Écouter l'événement voiceschanged pour recharger les voix si nécessaire
    if (this.synthesis) {
      this.synthesis.addEventListener('voiceschanged', loadVoices);
    }
  }

  // Initialiser l'AudioContext pour l'analyse audio
  private initAudioContext(): void {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext();
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 2048;
    }
  }

  // Récupérer la liste des voix disponibles
  public getAvailableVoices(): VoiceInfo[] {
    if (!this.synthesis) return [];
    
    return this.voices.map(voice => ({
      id: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      gender: voice.name.includes('Female') ? 'female' : voice.name.includes('Male') ? 'male' : 'neutral',
      isLocal: !voice.localService,
      isDefault: voice.default
    }));
  }

  // Méthode principale pour convertir le texte en parole
  public async speak(text: string, options?: Partial<TTSOptions>): Promise<void> {
    if (!text.trim()) return;
    
    // Ajouter le texte à la file d'attente
    this.queue.push(text);
    
    // Traiter la file d'attente si elle n'est pas déjà en cours de traitement
    if (!this.isProcessingQueue) {
      this.processQueue(options);
    }
  }

  // Traiter la file d'attente des messages vocaux
  private async processQueue(options?: Partial<TTSOptions>): Promise<void> {
    if (this.queue.length === 0 || this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.queue.length > 0) {
      const text = this.queue.shift()!;
      
      // Choisir la méthode de synthèse (locale ou OpenAI)
      const combinedOptions = { ...this.defaultOptions, ...options };
      
      if (combinedOptions.useOpenAI) {
        await this.speakWithOpenAI(text, combinedOptions);
      } else {
        await this.speakWithBrowser(text, combinedOptions);
      }
    }
    
    this.isProcessingQueue = false;
  }

  // Synthèse vocale avec l'API Web Speech
  private speakWithBrowser(text: string, options: TTSOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        console.error("La synthèse vocale n'est pas disponible dans ce navigateur");
        resolve();
        return;
      }
      
      // Créer un objet d'énoncé vocal
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configurer les options
      utterance.volume = options.volume ?? 1;
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      
      // Trouver la voix correspondante
      if (options.voice) {
        const matchingVoice = this.voices.find(v => v.name === options.voice || v.voiceURI === options.voice);
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      } else if (options.language) {
        // Sélectionner une voix par langue et genre si spécifiés
        const matchingVoices = this.voices.filter(v => v.lang.startsWith(options.language!));
        
        if (matchingVoices.length > 0) {
          if (options.gender && options.gender !== 'neutral') {
            const genderVoices = matchingVoices.filter(v => 
              (options.gender === 'female' && v.name.includes('Female')) ||
              (options.gender === 'male' && v.name.includes('Male'))
            );
            
            if (genderVoices.length > 0) {
              utterance.voice = genderVoices[0];
            } else {
              utterance.voice = matchingVoices[0];
            }
          } else {
            utterance.voice = matchingVoices[0];
          }
        }
      }
      
      // Gérer les événements
      utterance.onstart = () => {
        this.isSpeaking = true;
        this.onStartCallbacks.forEach(callback => callback());
      };
      
      utterance.onend = () => {
        this.isSpeaking = false;
        this.onEndCallbacks.forEach(callback => callback());
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('Erreur de synthèse vocale:', event);
        this.isSpeaking = false;
        this.onEndCallbacks.forEach(callback => callback());
        resolve();
      };
      
      // Lancer la synthèse
      this.synthesis.speak(utterance);
    });
  }

  // Synthèse vocale avec l'API OpenAI
  private async speakWithOpenAI(text: string, options: TTSOptions): Promise<void> {
    try {
      // Appel à l'API OpenAI TTS
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: options.voice || 'alloy',
          model: 'tts-1' // ou tts-1-hd pour une meilleure qualité
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Erreur API TTS: ${response.statusText}`);
      }
      
      // Récupérer le fichier audio
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Créer et configurer l'élément audio
      const audioElement = new Audio(audioUrl);
      
      return new Promise((resolve) => {
        // Configurer les options audio
        audioElement.volume = options.volume ?? 1;
        audioElement.playbackRate = options.rate ?? 1;
        
        // Connecter à l'analyseur audio si disponible
        if (this.audioContext && this.audioAnalyser) {
          const source = this.audioContext.createMediaElementSource(audioElement);
          source.connect(this.audioAnalyser);
          this.audioAnalyser.connect(this.audioContext.destination);
        }
        
        // Gérer les événements
        audioElement.onplay = () => {
          this.isSpeaking = true;
          this.onStartCallbacks.forEach(callback => callback());
        };
        
        audioElement.onended = () => {
          this.isSpeaking = false;
          this.onEndCallbacks.forEach(callback => callback());
          URL.revokeObjectURL(audioUrl); // Nettoyer l'URL
          resolve();
        };
        
        audioElement.onerror = (error) => {
          console.error('Erreur de lecture audio:', error);
          this.isSpeaking = false;
          this.onEndCallbacks.forEach(callback => callback());
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        // Démarrer la lecture
        audioElement.play().catch(error => {
          console.error('Erreur lors de la lecture audio:', error);
          resolve();
        });
      });
    } catch (error) {
      console.error('Erreur lors de la synthèse vocale OpenAI:', error);
      return Promise.resolve();
    }
  }

  // Arrêter la synthèse vocale
  public stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    
    this.queue = [];
    this.isSpeaking = false;
  }

  // Pause/reprise de la synthèse vocale
  public togglePause(): boolean {
    if (!this.synthesis) return false;
    
    if (this.synthesis.paused) {
      this.synthesis.resume();
      return false;
    } else {
      this.synthesis.pause();
      return true;
    }
  }

  // Vérifier si la synthèse est en cours
  public get speaking(): boolean {
    return this.isSpeaking;
  }

  // Enregistrer un callback pour l'événement de fin de parole
  public onEnd(callback: () => void): () => void {
    this.onEndCallbacks.push(callback);
    
    // Retourner une fonction pour supprimer le callback
    return () => {
      this.onEndCallbacks = this.onEndCallbacks.filter(cb => cb !== callback);
    };
  }

  // Enregistrer un callback pour l'événement de début de parole
  public onStart(callback: () => void): () => void {
    this.onStartCallbacks.push(callback);
    
    // Retourner une fonction pour supprimer le callback
    return () => {
      this.onStartCallbacks = this.onStartCallbacks.filter(cb => cb !== callback);
    };
  }
}

// Exporter une instance par défaut pour une utilisation simple
let ttsInstance: TextToSpeech | null = null;

export const getTextToSpeech = (options?: Partial<TTSOptions>): TextToSpeech => {
  if (!ttsInstance) {
    ttsInstance = new TextToSpeech(options);
  }
  
  return ttsInstance;
};

export default getTextToSpeech; 