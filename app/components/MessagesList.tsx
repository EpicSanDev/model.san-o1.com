'use client';

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface MessagesListProps {
  messages: Message[];
}

const MessagesList: React.FC<MessagesListProps> = ({ messages }) => {
  // Référence pour faire défiler automatiquement vers le dernier message
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Défilement automatique vers le bas lors de l'ajout de nouveaux messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Regrouper les messages par date
  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateKey = format(date, 'dd MMMM yyyy', { locale: fr });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className="flex-1 overflow-y-auto px-2 py-4">
      {Object.entries(messageGroups).map(([date, groupMessages]) => (
        <div key={date} className="mb-6">
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-500 dark:text-gray-400">
              {date}
            </span>
          </div>

          <div className="space-y-4 mt-4">
            {groupMessages.map((message, index) => {
              const time = format(new Date(message.timestamp), 'HH:mm', { locale: fr });
              
              if (message.role === 'system') {
                return (
                  <div key={index} className="text-center my-4">
                    <span className="inline-block px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 text-sm">
                      {message.content}
                    </span>
                  </div>
                );
              }

              const isUser = message.role === 'user';

              return (
                <div 
                  key={index}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      isUser 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div 
                      className={`text-xs mt-1 ${
                        isUser ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessagesList; 