'use client';

import { useState, useEffect } from 'react';
import { getTextToSpeech, VoiceInfo, TTSOptions } from '../lib/textToSpeech';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: TTSOptions) => void;
}

const VoiceSettings: React.FC<VoiceSettingsProps> = ({ isOpen, onClose, onSave }) => {
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [volume, setVolume] = useState<number>(1);
  const [rate, setRate] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);
  const [useOpenAI, setUseOpenAI] = useState<boolean>(false);
  const [openAIVoice, setOpenAIVoice] = useState<string>('alloy');
  const [language, setLanguage] = useState<string>('fr-FR');
  const [testText, setTestText] = useState<string>('Ceci est un test de synthèse vocale.');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  
  // Charger les voix disponibles
  useEffect(() => {
    if (!isOpen) return;
    
    const tts = getTextToSpeech();
    const availableVoices = tts.getAvailableVoices();
    setVoices(availableVoices);
    
    // Définir une voix par défaut si aucune n'est sélectionnée
    if (!selectedVoice && availableVoices.length > 0) {
      // Chercher une voix française
      const frenchVoice = availableVoices.find(voice => voice.lang.startsWith('fr'));
      setSelectedVoice(frenchVoice?.id || availableVoices[0].id);
    }
  }, [isOpen, selectedVoice]);
  
  // Tester la voix sélectionnée
  const testVoice = async () => {
    setIsTesting(true);
    
    const tts = getTextToSpeech();
    
    // Arrêter toute lecture en cours
    tts.stop();
    
    // Configurer les options
    const options: TTSOptions = useOpenAI 
      ? {
          useOpenAI: true,
          voice: openAIVoice,
          volume,
          rate
        }
      : {
          voice: selectedVoice,
          volume,
          rate,
          pitch,
          language
        };
    
    // Lire le texte de test
    await tts.speak(testText, options);
    
    setIsTesting(false);
  };
  
  // Sauvegarder les paramètres
  const handleSave = () => {
    const settings: TTSOptions = useOpenAI
      ? {
          useOpenAI: true,
          voice: openAIVoice,
          volume,
          rate
        }
      : {
          voice: selectedVoice,
          volume,
          rate,
          pitch,
          language
        };
    
    onSave(settings);
    onClose();
  };
  
  // Grouper les voix par langue
  const voicesByLanguage: Record<string, VoiceInfo[]> = voices.reduce((acc, voice) => {
    const lang = voice.lang.split('-')[0];
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(voice);
    return acc;
  }, {} as Record<string, VoiceInfo[]>);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Paramètres de Synthèse Vocale</h2>
        
        <div className="mb-4">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="useOpenAI"
              checked={useOpenAI}
              onChange={(e) => setUseOpenAI(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="useOpenAI">Utiliser OpenAI pour la synthèse vocale (meilleure qualité)</label>
          </div>
          
          {useOpenAI ? (
            <div className="mb-4">
              <label className="block mb-2">Voix OpenAI:</label>
              <div className="grid grid-cols-3 gap-2">
                {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map((voice) => (
                  <div key={voice} className="flex items-center">
                    <input
                      type="radio"
                      id={`voice-${voice}`}
                      name="openAIVoice"
                      value={voice}
                      checked={openAIVoice === voice}
                      onChange={() => setOpenAIVoice(voice)}
                      className="mr-2"
                    />
                    <label htmlFor={`voice-${voice}`} className="capitalize">{voice}</label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label htmlFor="language" className="block mb-2">Langue:</label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {Object.keys(voicesByLanguage).map((lang) => (
                    <option key={lang} value={`${lang}-${voicesByLanguage[lang][0].lang.split('-')[1] || 'FR'}`}>
                      {new Intl.DisplayNames([navigator.language], { type: 'language' }).of(lang) || lang.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="voice" className="block mb-2">Voix:</label>
                <select
                  id="voice"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  {voices
                    .filter(voice => voice.lang.startsWith(language.split('-')[0]))
                    .map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} {voice.gender ? `(${voice.gender})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="pitch" className="block mb-2">
                  Hauteur: {pitch.toFixed(1)}
                </label>
                <input
                  type="range"
                  id="pitch"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}
          
          <div className="mb-4">
            <label htmlFor="rate" className="block mb-2">
              Vitesse: {rate.toFixed(1)}
            </label>
            <input
              type="range"
              id="rate"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="volume" className="block mb-2">
              Volume: {volume.toFixed(1)}
            </label>
            <input
              type="range"
              id="volume"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="testText" className="block mb-2">Texte de test:</label>
          <div className="flex">
            <input
              type="text"
              id="testText"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="flex-1 p-2 border rounded-l"
            />
            <button
              onClick={testVoice}
              disabled={isTesting}
              className={`px-4 py-2 rounded-r ${
                isTesting ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isTesting ? 'En cours...' : 'Tester'}
            </button>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings; 