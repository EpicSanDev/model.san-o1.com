'use client';

import React, { useState } from 'react';
import { useAssistant } from '../context/AssistantContext';
import ModulesManager from './ModulesManager';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'voice' | 'modules' | 'memory'>('general');
  const [settings, setSettings] = useState({
    general: {
      username: 'Utilisateur',
      language: 'fr-FR',
      theme: 'light',
    },
    voice: {
      activationKeyword: 'assistant',
      sensitivity: 0.7,
      language: 'fr-FR',
      volume: 1.0,
      speed: 1.0,
      pitch: 1.0,
      continuousListening: true,
      silenceThreshold: 1.5, // en secondes
    },
    memory: {
      retentionPeriod: 30, // en jours
      importanceThreshold: 0.6,
      automaticMemorization: true,
    },
  });

  if (!isOpen) return null;

  const handleSave = () => {
    // Enregistrer les paramètres (simulé)
    console.log('Paramètres enregistrés:', settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Paramètres</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Barre de navigation latérale */}
          <div className="md:w-1/4 border-r bg-gray-50">
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md ${
                      activeTab === 'general' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab('general')}
                  >
                    Général
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md ${
                      activeTab === 'voice' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab('voice')}
                  >
                    Reconnaissance vocale
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md ${
                      activeTab === 'modules' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab('modules')}
                  >
                    Modules
                  </button>
                </li>
                <li>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md ${
                      activeTab === 'memory' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveTab('memory')}
                  >
                    Mémoire
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          {/* Contenu des paramètres */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Paramètres généraux</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={settings.general.username}
                      onChange={e => setSettings({
                        ...settings,
                        general: { ...settings.general, username: e.target.value }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                      Langue
                    </label>
                    <select
                      id="language"
                      value={settings.general.language}
                      onChange={e => setSettings({
                        ...settings,
                        general: { ...settings.general, language: e.target.value }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="fr-FR">Français</option>
                      <option value="en-US">Anglais (US)</option>
                      <option value="en-GB">Anglais (UK)</option>
                      <option value="es-ES">Espagnol</option>
                      <option value="de-DE">Allemand</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                      Thème
                    </label>
                    <select
                      id="theme"
                      value={settings.general.theme}
                      onChange={e => setSettings({
                        ...settings,
                        general: { ...settings.general, theme: e.target.value }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="light">Clair</option>
                      <option value="dark">Sombre</option>
                      <option value="system">Système</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Paramètres de reconnaissance vocale</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="activationKeyword" className="block text-sm font-medium text-gray-700">
                      Mot-clé d'activation
                    </label>
                    <input
                      type="text"
                      id="activationKeyword"
                      value={settings.voice.activationKeyword}
                      onChange={e => setSettings({
                        ...settings,
                        voice: { ...settings.voice, activationKeyword: e.target.value }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">Mot qui activera l'assistant lorsqu'il est prononcé</p>
                  </div>
                  
                  <div>
                    <label htmlFor="sensitivity" className="block text-sm font-medium text-gray-700">
                      Sensibilité ({Math.round(settings.voice.sensitivity * 100)}%)
                    </label>
                    <input
                      type="range"
                      id="sensitivity"
                      value={settings.voice.sensitivity}
                      min="0"
                      max="1"
                      step="0.1"
                      onChange={e => setSettings({
                        ...settings,
                        voice: { ...settings.voice, sensitivity: parseFloat(e.target.value) }
                      })}
                      className="mt-1 block w-full"
                    />
                    <p className="mt-1 text-sm text-gray-500">Contrôle la sensibilité de détection du mot-clé</p>
                  </div>
                  
                  <div>
                    <label htmlFor="voiceLanguage" className="block text-sm font-medium text-gray-700">
                      Langue de reconnaissance
                    </label>
                    <select
                      id="voiceLanguage"
                      value={settings.voice.language}
                      onChange={e => setSettings({
                        ...settings,
                        voice: { ...settings.voice, language: e.target.value }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="fr-FR">Français</option>
                      <option value="en-US">Anglais (US)</option>
                      <option value="en-GB">Anglais (UK)</option>
                      <option value="es-ES">Espagnol</option>
                      <option value="de-DE">Allemand</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="continuousListening"
                      checked={settings.voice.continuousListening}
                      onChange={e => setSettings({
                        ...settings,
                        voice: { ...settings.voice, continuousListening: e.target.checked }
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="continuousListening" className="ml-2 block text-sm text-gray-700">
                      Écoute continue
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="silenceThreshold" className="block text-sm font-medium text-gray-700">
                      Délai de silence ({settings.voice.silenceThreshold} s)
                    </label>
                    <input
                      type="range"
                      id="silenceThreshold"
                      value={settings.voice.silenceThreshold}
                      min="0.5"
                      max="3"
                      step="0.1"
                      onChange={e => setSettings({
                        ...settings,
                        voice: { ...settings.voice, silenceThreshold: parseFloat(e.target.value) }
                      })}
                      className="mt-1 block w-full"
                    />
                    <p className="mt-1 text-sm text-gray-500">Délai en secondes de silence avant de traiter l'entrée</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Gestion des modules</h3>
                <ModulesManager />
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Paramètres de mémoire</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="retentionPeriod" className="block text-sm font-medium text-gray-700">
                      Période de rétention ({settings.memory.retentionPeriod} jours)
                    </label>
                    <input
                      type="range"
                      id="retentionPeriod"
                      value={settings.memory.retentionPeriod}
                      min="1"
                      max="365"
                      step="1"
                      onChange={e => setSettings({
                        ...settings,
                        memory: { ...settings.memory, retentionPeriod: parseInt(e.target.value) }
                      })}
                      className="mt-1 block w-full"
                    />
                    <p className="mt-1 text-sm text-gray-500">Durée pendant laquelle les informations sont conservées</p>
                  </div>
                  
                  <div>
                    <label htmlFor="importanceThreshold" className="block text-sm font-medium text-gray-700">
                      Seuil d'importance ({Math.round(settings.memory.importanceThreshold * 100)}%)
                    </label>
                    <input
                      type="range"
                      id="importanceThreshold"
                      value={settings.memory.importanceThreshold}
                      min="0"
                      max="1"
                      step="0.1"
                      onChange={e => setSettings({
                        ...settings,
                        memory: { ...settings.memory, importanceThreshold: parseFloat(e.target.value) }
                      })}
                      className="mt-1 block w-full"
                    />
                    <p className="mt-1 text-sm text-gray-500">Définit l'importance minimale pour qu'une information soit mémorisée</p>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="automaticMemorization"
                      checked={settings.memory.automaticMemorization}
                      onChange={e => setSettings({
                        ...settings,
                        memory: { ...settings.memory, automaticMemorization: e.target.checked }
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="automaticMemorization" className="ml-2 block text-sm text-gray-700">
                      Mémorisation automatique
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 