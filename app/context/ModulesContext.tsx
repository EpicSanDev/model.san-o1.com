'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// Type pour les modules
export interface Module {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon?: string;
  settings?: Record<string, any>;
  requiredPermissions?: string[];
  version: string;
}

// Type pour les requêtes d'action des modules
export interface ModuleAction {
  moduleId: string;
  action: string;
  parameters?: Record<string, any>;
}

// Type pour les résultats d'action des modules
export interface ModuleActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Interface du contexte des modules
interface ModulesContextType {
  modules: Module[];
  loadingModules: boolean;
  enabledModules: Module[];
  // Gestion des modules
  toggleModule: (moduleId: string) => Promise<boolean>;
  installModule: (moduleData: Omit<Module, 'id' | 'version'>) => Promise<Module | null>;
  uninstallModule: (moduleId: string) => Promise<boolean>;
  updateModuleSettings: (moduleId: string, settings: Record<string, any>) => Promise<boolean>;
  // Exécution d'actions
  executeModuleAction: (action: ModuleAction) => Promise<ModuleActionResult>;
  // Information sur les modules
  getModuleById: (moduleId: string) => Module | null;
  getEnabledModulesByCategory: (category: string) => Module[];
  refreshModules: () => Promise<void>;
}

// Créer le contexte
const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

// Provider du contexte
export const ModulesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState<boolean>(true);

  // Modules activés seulement
  const enabledModules = modules.filter(module => module.enabled);

  // Charger les modules au démarrage
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await fetch('/api/modules');
        if (response.ok) {
          const data = await response.json();
          setModules(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des modules:', error);
      } finally {
        setLoadingModules(false);
      }
    };

    fetchModules();
  }, []);

  // Activer/désactiver un module
  const toggleModule = async (moduleId: string): Promise<boolean> => {
    try {
      const moduleIndex = modules.findIndex(m => m.id === moduleId);
      if (moduleIndex === -1) return false;

      const updatedModule = { ...modules[moduleIndex], enabled: !modules[moduleIndex].enabled };
      
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: updatedModule.enabled }),
      });

      if (response.ok) {
        setModules(prev => {
          const newModules = [...prev];
          newModules[moduleIndex] = updatedModule;
          return newModules;
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la modification du module:', error);
      return false;
    }
  };

  // Installer un nouveau module
  const installModule = async (moduleData: Omit<Module, 'id' | 'version'>): Promise<Module | null> => {
    try {
      const response = await fetch('/api/modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moduleData),
      });

      if (response.ok) {
        const newModule = await response.json();
        setModules(prev => [...prev, newModule]);
        return newModule;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de l\'installation du module:', error);
      return null;
    }
  };

  // Désinstaller un module
  const uninstallModule = async (moduleId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setModules(prev => prev.filter(m => m.id !== moduleId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la désinstallation du module:', error);
      return false;
    }
  };

  // Mettre à jour les paramètres d'un module
  const updateModuleSettings = async (moduleId: string, settings: Record<string, any>): Promise<boolean> => {
    try {
      const moduleIndex = modules.findIndex(m => m.id === moduleId);
      if (moduleIndex === -1) return false;

      const updatedModule = { 
        ...modules[moduleIndex], 
        settings: { ...modules[moduleIndex].settings, ...settings } 
      };
      
      const response = await fetch(`/api/modules/${moduleId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        setModules(prev => {
          const newModules = [...prev];
          newModules[moduleIndex] = updatedModule;
          return newModules;
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres du module:', error);
      return false;
    }
  };

  // Exécuter une action d'un module
  const executeModuleAction = async (action: ModuleAction): Promise<ModuleActionResult> => {
    try {
      const module = modules.find(m => m.id === action.moduleId);
      if (!module) {
        return { success: false, error: 'Module non trouvé' };
      }
      
      if (!module.enabled) {
        return { success: false, error: 'Module désactivé' };
      }

      const response = await fetch(`/api/modules/${action.moduleId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: action.action, parameters: action.parameters }),
      });

      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json();
      return { success: false, error: errorData.error || 'Erreur inconnue' };
    } catch (error) {
      console.error('Erreur lors de l\'exécution de l\'action du module:', error);
      return { success: false, error: 'Erreur serveur' };
    }
  };

  // Obtenir un module par son ID
  const getModuleById = (moduleId: string): Module | null => {
    return modules.find(m => m.id === moduleId) || null;
  };

  // Obtenir les modules activés par catégorie
  const getEnabledModulesByCategory = (category: string): Module[] => {
    return enabledModules.filter(m => m.settings?.category === category);
  };

  // Actualiser la liste des modules
  const refreshModules = async (): Promise<void> => {
    setLoadingModules(true);
    try {
      const response = await fetch('/api/modules');
      if (response.ok) {
        const data = await response.json();
        setModules(data);
      }
    } catch (error) {
      console.error('Erreur lors de l\'actualisation des modules:', error);
    } finally {
      setLoadingModules(false);
    }
  };

  return (
    <ModulesContext.Provider
      value={{
        modules,
        loadingModules,
        enabledModules,
        toggleModule,
        installModule,
        uninstallModule,
        updateModuleSettings,
        executeModuleAction,
        getModuleById,
        getEnabledModulesByCategory,
        refreshModules,
      }}
    >
      {children}
    </ModulesContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useModules = () => {
  const context = useContext(ModulesContext);
  if (context === undefined) {
    throw new Error('useModules doit être utilisé dans un ModulesProvider');
  }
  return context;
}; 