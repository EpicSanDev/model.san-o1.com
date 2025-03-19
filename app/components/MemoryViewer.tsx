'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiSearch, FiFilter, FiTrash, FiEdit } from 'react-icons/fi';

interface Memory {
  id: string;
  content: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryViewerProps {
  memories: Memory[];
}

const MemoryViewer: React.FC<MemoryViewerProps> = ({ memories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [editingMemory, setEditingMemory] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Obtenir tous les types de mémoire uniques
  const memoryTypes = Array.from(new Set(memories.map(memory => memory.type)));

  // Filtrer les mémoires
  const filteredMemories = memories.filter(memory => {
    const matchesSearch = memory.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter ? memory.type === activeFilter : true;
    return matchesSearch && matchesFilter;
  });

  // Trier les mémoires par date de mise à jour (plus récentes en premier)
  const sortedMemories = [...filteredMemories].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Simuler la suppression d'une mémoire
  const handleDelete = (id: string) => {
    // Ici, nous simulons l'appel API pour supprimer
    alert(`Suppression de la mémoire ${id} - Intégrer l'appel API réel`);
  };

  // Simuler la mise à jour d'une mémoire
  const handleUpdate = (id: string) => {
    if (!editContent.trim()) return;
    
    // Ici, nous simulons l'appel API pour mettre à jour
    alert(`Mise à jour de la mémoire ${id} avec le contenu: ${editContent} - Intégrer l'appel API réel`);
    
    setEditingMemory(null);
    setEditContent('');
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Mémoire à long terme</h2>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher dans la mémoire..."
            className="input pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FiSearch className="absolute right-3 top-3 text-gray-400" size={20} />
        </div>
        
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-500" size={18} />
          <select
            className="input !py-1 !px-2"
            value={activeFilter || ''}
            onChange={(e) => setActiveFilter(e.target.value || null)}
          >
            <option value="">Tous les types</option>
            {memoryTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {sortedMemories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm || activeFilter
            ? 'Aucune mémoire ne correspond à vos critères de recherche'
            : 'La mémoire est vide pour le moment'}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMemories.map(memory => (
            <div key={memory.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              {editingMemory === memory.id ? (
                <div className="space-y-3">
                  <textarea
                    className="input !h-24 resize-none"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingMemory(null);
                        setEditContent('');
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleUpdate(memory.id)}
                      disabled={!editContent.trim()}
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                      {memory.type}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                        onClick={() => {
                          setEditingMemory(memory.id);
                          setEditContent(memory.content);
                        }}
                        aria-label="Modifier"
                      >
                        <FiEdit size={16} />
                      </button>
                      <button
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                        onClick={() => handleDelete(memory.id)}
                        aria-label="Supprimer"
                      >
                        <FiTrash size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 mb-2">{memory.content}</p>
                  <div className="text-xs text-gray-500">
                    Mis à jour le {format(new Date(memory.updatedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoryViewer; 