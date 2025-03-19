'use client';

import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };
  
  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };
  
  return (
    <form onSubmit={handleSearch} className="relative w-full sm:w-64">
      <div className="relative">
        <input
          type="text"
          className="w-full pl-10 pr-10 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-white placeholder-white/75 focus:outline-none focus:ring-2 focus:ring-white/50"
          placeholder="Rechercher des événements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {searchQuery && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/75 hover:text-white"
            onClick={handleClear}
            aria-label="Effacer la recherche"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <button type="submit" className="sr-only">Rechercher</button>
    </form>
  );
};

export default SearchBar; 