// Import des extensions Jest pour React Testing Library
import '@testing-library/jest-dom';

// Simuler les variables d'environnement
process.env = {
  ...process.env,
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  OPENAI_API_KEY: 'test-openai-key',
  PINECONE_API_KEY: 'test-pinecone-key',
  PINECONE_ENVIRONMENT: 'test-environment',
  PINECONE_INDEX: 'test-index',
};

// Mock pour fetch
global.fetch = jest.fn();

// Réinitialiser les mocks après chaque test
afterEach(() => {
  jest.clearAllMocks();
}); 