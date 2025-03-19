import { MemoryVectorStore, Memory } from '../../app/lib/vectorStore';
import { PineconeClient } from '@pinecone-database/pinecone';
import { PrismaClient } from '@prisma/client';
import { OpenAIService } from '../../app/lib/openai';

// Mock des dépendances
jest.mock('@pinecone-database/pinecone');
jest.mock('@prisma/client');
jest.mock('../../app/lib/openai');

// Mock pour Pinecone
const mockPineconeIndex = {
  upsert: jest.fn().mockResolvedValue({}),
  query: jest.fn().mockResolvedValue({
    matches: [
      {
        id: 'memory1',
        score: 0.9,
        metadata: {
          content: 'Premier souvenir important',
          type: 'general',
          memoryId: 'memory1',
        },
      },
      {
        id: 'memory2',
        score: 0.8,
        metadata: {
          content: 'Deuxième souvenir important',
          type: 'general',
          memoryId: 'memory2',
        },
      },
    ],
  }),
  delete: jest.fn().mockResolvedValue({}),
};

const MockedPineconeClient = PineconeClient as jest.MockedClass<typeof PineconeClient>;
MockedPineconeClient.prototype.init = jest.fn().mockResolvedValue(undefined);
MockedPineconeClient.prototype.Index = jest.fn().mockReturnValue(mockPineconeIndex);

// Mock pour Prisma
const mockPrismaMemory = {
  create: jest.fn().mockImplementation(({ data }) => {
    return Promise.resolve({
      id: 'memory-id',
      content: data.content,
      type: data.type,
      userId: data.userId,
      vectorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }),
  update: jest.fn().mockImplementation(({ where, data }) => {
    return Promise.resolve({
      id: where.id,
      content: data.content || 'Contenu de mémoire',
      type: data.type || 'general',
      userId: 'user1',
      vectorId: data.vectorId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }),
  findUnique: jest.fn().mockImplementation(({ where }) => {
    return Promise.resolve({
      id: where.id,
      content: 'Contenu de mémoire',
      type: 'general',
      userId: 'user1',
      vectorId: where.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }),
  delete: jest.fn().mockResolvedValue({}),
};

const MockedPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;
MockedPrismaClient.prototype.memory = mockPrismaMemory;

// Mock pour OpenAIService
const MockedOpenAIService = OpenAIService as jest.MockedClass<typeof OpenAIService>;
const mockOpenAIService = {
  createEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
};

describe('MemoryVectorStore', () => {
  let memoryStore: MemoryVectorStore;
  
  beforeEach(() => {
    jest.clearAllMocks();
    memoryStore = new MemoryVectorStore();
    memoryStore.setOpenAIService(mockOpenAIService as unknown as OpenAIService);
  });
  
  test('initialize() - Initialise correctement la connexion à Pinecone', async () => {
    await memoryStore.initialize();
    
    expect(MockedPineconeClient.prototype.init).toHaveBeenCalledWith({
      environment: process.env.PINECONE_ENVIRONMENT || '',
      apiKey: process.env.PINECONE_API_KEY || '',
    });
  });
  
  test('addMemory() - Ajoute correctement une mémoire dans la base de données et Pinecone', async () => {
    const content = 'Nouveau souvenir à mémoriser';
    const type = 'important';
    const userId = 'user123';
    
    const result = await memoryStore.addMemory(content, type, userId);
    
    // Vérifier que l'embedding a été créé
    expect(mockOpenAIService.createEmbedding).toHaveBeenCalledWith(content);
    
    // Vérifier que la mémoire a été créée dans Prisma
    expect(mockPrismaMemory.create).toHaveBeenCalledWith({
      data: {
        content,
        type,
        userId,
      },
    });
    
    // Vérifier que le vecteur a été créé dans Pinecone
    expect(mockPineconeIndex.upsert).toHaveBeenCalledWith({
      id: 'memory-id',
      values: [0.1, 0.2, 0.3],
      metadata: {
        content,
        type,
        memoryId: 'memory-id',
      },
    });
    
    // Vérifier que la mémoire a été mise à jour avec l'ID du vecteur
    expect(mockPrismaMemory.update).toHaveBeenCalledWith({
      where: { id: 'memory-id' },
      data: { vectorId: 'memory-id' },
    });
    
    // Vérifier la structure du résultat
    expect(result).toEqual({
      id: 'memory-id',
      content: expect.any(String),
      type,
      vectorId: 'memory-id',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });
  
  test('similaritySearch() - Effectue correctement une recherche par similarité', async () => {
    const query = 'Recherche de souvenirs';
    const limit = 3;
    
    const result = await memoryStore.similaritySearch(query, limit);
    
    // Vérifier que l'embedding a été créé pour la requête
    expect(mockOpenAIService.createEmbedding).toHaveBeenCalledWith(query);
    
    // Vérifier que la requête a été faite à Pinecone
    expect(mockPineconeIndex.query).toHaveBeenCalledWith({
      vector: [0.1, 0.2, 0.3],
      topK: limit,
      includeMetadata: true,
    });
    
    // Vérifier que les données correctes ont été récupérées de Prisma
    expect(mockPrismaMemory.findUnique).toHaveBeenCalledTimes(2);
    
    // Vérifier la structure du résultat
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'memory1',
      content: 'Contenu de mémoire',
      type: 'general',
      vectorId: 'memory1',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });
  
  test('deleteMemory() - Supprime correctement une mémoire', async () => {
    const memoryId = 'memory-to-delete';
    
    const result = await memoryStore.deleteMemory(memoryId);
    
    // Vérifier que la mémoire a été supprimée de Prisma
    expect(mockPrismaMemory.delete).toHaveBeenCalledWith({
      where: { id: memoryId },
    });
    
    // Vérifier que le vecteur a été supprimé de Pinecone
    expect(mockPineconeIndex.delete).toHaveBeenCalledWith({
      ids: [memoryId],
    });
    
    // Vérifier que la fonction retourne true en cas de succès
    expect(result).toBe(true);
  });
}); 