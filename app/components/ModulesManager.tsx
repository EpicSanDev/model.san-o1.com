'use client';

import React, { useState } from 'react';
import { useModules, Module } from '../context/ModulesContext';

interface ModuleCardProps {
  module: Module;
  onToggle: (moduleId: string) => Promise<void>;
  onSettings: (module: Module) => void;
  onUninstall: (moduleId: string) => Promise<void>;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  onToggle,
  onSettings,
  onUninstall
}) => {
  return (
    <div className={`border rounded-lg p-4 shadow-sm ${module.enabled ? 'bg-green-50' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {module.icon && (
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200">
              <span className="text-xl">{module.icon}</span>
            </div>
          )}
          <h3 className="text-lg font-semibold">{module.name}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className={`px-3 py-1 rounded-md text-sm ${
              module.enabled 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-300 text-gray-800'
            }`}
            onClick={() => onToggle(module.id)}
          >
            {module.enabled ? 'Activé' : 'Désactivé'}
          </button>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{module.description}</p>
      
      <div className="text-xs text-gray-500 flex justify-between items-center">
        <span>Version {module.version}</span>
        <div className="flex space-x-2">
          <button
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            onClick={() => onSettings(module)}
          >
            Paramètres
          </button>
          <button
            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            onClick={() => onUninstall(module.id)}
          >
            Désinstaller
          </button>
        </div>
      </div>
    </div>
  );
};

interface ModuleSettingsProps {
  module: Module | null;
  onClose: () => void;
  onSave: (moduleId: string, settings: Record<string, any>) => Promise<void>;
}

const ModuleSettings: React.FC<ModuleSettingsProps> = ({
  module,
  onClose,
  onSave
}) => {
  const [settings, setSettings] = useState<Record<string, any>>(module?.settings || {});

  if (!module) return null;

  const handleSave = async () => {
    await onSave(module.id, settings);
    onClose();
  };

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Paramètres: {module.name}</h2>
        
        <div className="space-y-4 mb-6">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <label htmlFor={key} className="block text-sm font-medium text-gray-700">
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
              
              {typeof value === 'boolean' ? (
                <input
                  type="checkbox"
                  id={key}
                  checked={value as boolean}
                  onChange={e => handleChange(key, e.target.checked)}
                  className="rounded border-gray-300"
                />
              ) : typeof value === 'number' ? (
                <input
                  type="number"
                  id={key}
                  value={value as number}
                  onChange={e => handleChange(key, parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              ) : (
                <input
                  type="text"
                  id={key}
                  value={value as string}
                  onChange={e => handleChange(key, e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              )}
            </div>
          ))}
          
          {Object.keys(settings).length === 0 && (
            <p className="text-gray-500 text-sm">Aucun paramètre disponible pour ce module.</p>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 rounded-md text-white hover:bg-blue-600"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

const ModulesManager: React.FC = () => {
  const { 
    modules, 
    loadingModules, 
    toggleModule, 
    installModule, 
    uninstallModule, 
    updateModuleSettings,
    refreshModules 
  } = useModules();

  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showNewModuleForm, setShowNewModuleForm] = useState(false);
  const [newModule, setNewModule] = useState({
    name: '',
    description: '',
    enabled: false
  });

  const handleToggleModule = async (moduleId: string) => {
    await toggleModule(moduleId);
  };

  const handleOpenSettings = (module: Module) => {
    setSelectedModule(module);
  };

  const handleCloseSettings = () => {
    setSelectedModule(null);
  };

  const handleSaveSettings = async (moduleId: string, settings: Record<string, any>) => {
    await updateModuleSettings(moduleId, settings);
    refreshModules();
  };

  const handleUninstallModule = async (moduleId: string) => {
    const confirmed = window.confirm('Êtes-vous sûr de vouloir désinstaller ce module?');
    if (confirmed) {
      await uninstallModule(moduleId);
    }
  };

  const handleCreateModule = async () => {
    if (!newModule.name || !newModule.description) {
      alert('Le nom et la description sont requis.');
      return;
    }
    
    await installModule(newModule);
    setShowNewModuleForm(false);
    setNewModule({ name: '', description: '', enabled: false });
  };

  if (loadingModules) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Modules</h2>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          onClick={() => setShowNewModuleForm(true)}
        >
          Ajouter un module
        </button>
      </div>
      
      {modules.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Aucun module disponible. Ajoutez-en un pour commencer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(module => (
            <ModuleCard
              key={module.id}
              module={module}
              onToggle={handleToggleModule}
              onSettings={handleOpenSettings}
              onUninstall={handleUninstallModule}
            />
          ))}
        </div>
      )}
      
      {selectedModule && (
        <ModuleSettings
          module={selectedModule}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
        />
      )}
      
      {showNewModuleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Ajouter un nouveau module</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom
                </label>
                <input
                  type="text"
                  id="name"
                  value={newModule.name}
                  onChange={e => setNewModule(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newModule.description}
                  onChange={e => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  rows={3}
                  required
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={newModule.enabled}
                  onChange={e => setNewModule(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded border-gray-300 mr-2"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                  Activer immédiatement
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewModuleForm(false)}
                className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateModule}
                className="px-4 py-2 bg-blue-500 rounded-md text-white hover:bg-blue-600"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModulesManager; 