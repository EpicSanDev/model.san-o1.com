'use client';

import React from 'react';
import Settings from './Settings';

interface HeaderProps {
  activeTab: 'chat' | 'memory';
  setActiveTab: (tab: 'chat' | 'memory') => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isSettingsOpen,
  setIsSettingsOpen
}) => {
  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="font-bold text-xl text-blue-600">AssistantIA</div>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Beta</span>
          </div>
          
          <div className="flex space-x-4 items-center">
            <nav className="hidden md:flex space-x-1">
              <button
                className={`px-3 py-2 rounded-md ${
                  activeTab === 'chat'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button
                className={`px-3 py-2 rounded-md ${
                  activeTab === 'memory'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('memory')}
              >
                Mémoire
              </button>
            </nav>
            
            <button
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Paramètres"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="md:hidden flex mt-2 border-t pt-2">
          <div className="flex justify-around w-full">
            <button
              className={`px-3 py-1 rounded-md flex items-center ${
                activeTab === 'chat'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600'
              }`}
              onClick={() => setActiveTab('chat')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              Chat
            </button>
            <button
              className={`px-3 py-1 rounded-md flex items-center ${
                activeTab === 'memory'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600'
              }`}
              onClick={() => setActiveTab('memory')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Mémoire
            </button>
          </div>
        </div>
      </div>
      
      {isSettingsOpen && (
        <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      )}
    </header>
  );
};

export default Header; 