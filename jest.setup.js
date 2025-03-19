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
  QDRANT_API_KEY: 'test-qdrant-key',
  QDRANT_URL: 'http://localhost:6333',
  QDRANT_COLLECTION: 'test-collection',
};

// Mock pour fetch
global.fetch = jest.fn();

// Mock pour OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }]
        })
      },
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Réponse du modèle' } }]
          })
        }
      }
    }))
  };
});

// Mock pour @qdrant/js-client-rest
jest.mock('@qdrant/js-client-rest', () => {
  return {
    QdrantClient: jest.fn().mockImplementation(() => ({
      getCollections: jest.fn().mockResolvedValue({ collections: [] }),
      createCollection: jest.fn().mockResolvedValue({}),
      upsert: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockResolvedValue({ points: [] }),
    })),
  };
});

// Réinitialiser les mocks après chaque test
afterEach(() => {
  jest.clearAllMocks();
}); 