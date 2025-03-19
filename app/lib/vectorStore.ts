import { QdrantClient } from '@qdrant/js-client-rest';
import { PrismaClient } from '@prisma/client';
import { OpenAIService } from './openai';

// Interface pour représenter une mémoire
export interface Memory {
  id: string;
  content: string;
  type: string;
  vectorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Client Prisma pour interagir avec la base de données
const prisma = new PrismaClient();

// Classe pour gérer la mémoire vectorielle
export class MemoryVectorStore {
  private qdrant: QdrantClient;
  private openAIService: OpenAIService | null = null;
  private collectionName: string;
  private initialized: boolean = false;

  constructor() {
    // Initialiser le client Qdrant avec l'URL du service dans Kubernetes
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://qdrant-service.default.svc.cluster.local:6333',
    });
    this.collectionName = process.env.QDRANT_COLLECTION || 'assistant-memory';
  }

  // Initialiser la connexion à Qdrant
  async initialize() {
    try {
      // Vérifier si la collection existe déjà
      const collections = await this.qdrant.getCollections();
      const collectionExists = collections.collections.some(
        (collection) => collection.name === this.collectionName
      );

      // Créer la collection si elle n'existe pas
      if (!collectionExists) {
        await this.qdrant.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // Dimension pour les embeddings OpenAI (ajuster selon le modèle utilisé)
            distance: 'Cosine',
          },
        });
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Qdrant:', error);
      throw error;
    }
  }

  // Setter pour l'instance OpenAIService (pour éviter la référence circulaire)
  setOpenAIService(service: OpenAIService) {
    this.openAIService = service;
  }

  // Ajouter une mémoire à la base de données et au store vectoriel
  async addMemory(content: string, type: string = 'general', userId: string): Promise<Memory> {
    try {
      if (!this.openAIService) {
        throw new Error('OpenAIService n\'est pas initialisé');
      }

      if (!this.initialized) {
        await this.initialize();
      }

      // Créer l'embedding
      const embedding = await this.openAIService.createEmbedding(content);
      
      // Créer la mémoire dans la base de données
      const memory = await prisma.memory.create({
        data: {
          content,
          type,
          userId,
        },
      });
      
      // Ajouter le vecteur dans Qdrant
      await this.qdrant.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: memory.id,
            vector: embedding,
            payload: {
              content,
              type,
              memoryId: memory.id,
            },
          },
        ],
      });
      
      // Mettre à jour la mémoire avec l'ID du vecteur
      const updatedMemory = await prisma.memory.update({
        where: { id: memory.id },
        data: { vectorId: memory.id },
      });
      
      return {
        id: updatedMemory.id,
        content: updatedMemory.content,
        type: updatedMemory.type,
        vectorId: updatedMemory.vectorId || undefined,
        createdAt: updatedMemory.createdAt,
        updatedAt: updatedMemory.updatedAt,
      };
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la mémoire:', error);
      throw error;
    }
  }

  // Recherche de similarité dans la base vectorielle
  async similaritySearch(query: string, limit: number = 5): Promise<Memory[]> {
    try {
      if (!this.openAIService) {
        throw new Error('OpenAIService n\'est pas initialisé');
      }

      if (!this.initialized) {
        await this.initialize();
      }

      // Créer l'embedding pour la requête
      const queryEmbedding = await this.openAIService.createEmbedding(query);
      
      // Rechercher les vecteurs similaires
      const searchResult = await this.qdrant.search(this.collectionName, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true,
      });
      
      if (!searchResult || searchResult.length === 0) {
        return [];
      }
      
      // Récupérer les mémoires correspondantes depuis la base de données
      const memoryIds = searchResult.map((match) => match.id.toString());
      
      const memories = await prisma.memory.findMany({
        where: {
          id: {
            in: memoryIds,
          },
        },
      });
      
      // Trier les mémoires dans le même ordre que les résultats de la recherche
      const sortedMemories = memoryIds
        .map((id) => {
          const memory = memories.find((m) => m.id === id);
          if (!memory) return null;
          
          return {
            id: memory.id,
            content: memory.content,
            type: memory.type,
            vectorId: memory.vectorId || undefined,
            createdAt: memory.createdAt,
            updatedAt: memory.updatedAt,
          } as Memory;
        })
        .filter((m): m is Memory => m !== null);
      
      return sortedMemories;
    } catch (error) {
      console.error('Erreur lors de la recherche de similarité:', error);
      return [];
    }
  }

  // Supprimer une mémoire
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Supprimer de la base de données
      await prisma.memory.delete({
        where: { id: memoryId },
      });
      
      // Supprimer de Qdrant
      await this.qdrant.delete(this.collectionName, {
        wait: true,
        points: [memoryId],
      });
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la mémoire:', error);
      return false;
    }
  }

  // Mettre à jour une mémoire
  async updateMemory(memoryId: string, content: string, type?: string): Promise<Memory | null> {
    try {
      if (!this.openAIService) {
        throw new Error('OpenAIService n\'est pas initialisé');
      }

      if (!this.initialized) {
        await this.initialize();
      }

      // Mettre à jour dans la base de données
      const updateData: { content: string; type?: string } = { content };
      if (type) updateData.type = type;
      
      const updatedMemory = await prisma.memory.update({
        where: { id: memoryId },
        data: updateData,
      });
      
      // Créer le nouvel embedding
      const newEmbedding = await this.openAIService.createEmbedding(content);
      
      // Mettre à jour dans Qdrant
      await this.qdrant.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: memoryId,
            vector: newEmbedding,
            payload: {
              content,
              type: updatedMemory.type,
              memoryId: updatedMemory.id,
            },
          },
        ],
      });
      
      return {
        id: updatedMemory.id,
        content: updatedMemory.content,
        type: updatedMemory.type,
        vectorId: updatedMemory.vectorId || undefined,
        createdAt: updatedMemory.createdAt,
        updatedAt: updatedMemory.updatedAt,
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la mémoire:', error);
      return null;
    }
  }
}

// Exporter une instance singleton
let vectorStoreInstance: MemoryVectorStore | null = null;

export const getVectorStore = async (): Promise<MemoryVectorStore> => {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new MemoryVectorStore();
    await vectorStoreInstance.initialize();
  }
  
  return vectorStoreInstance;
}; 