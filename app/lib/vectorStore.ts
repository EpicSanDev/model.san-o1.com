import { PineconeClient } from '@pinecone-database/pinecone';
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
  private pinecone: PineconeClient;
  private openAIService: OpenAIService | null = null;
  private indexName: string;

  constructor() {
    this.pinecone = new PineconeClient();
    this.indexName = process.env.PINECONE_INDEX || 'assistant-memory';
  }

  // Initialiser la connexion à Pinecone
  async initialize() {
    await this.pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT || '',
      apiKey: process.env.PINECONE_API_KEY || '',
    });
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

      // Créer l'embedding
      const embedding = await this.openAIService.createEmbedding(content);
      
      // Obtenir l'index Pinecone
      const index = this.pinecone.Index(this.indexName);
      
      // Créer la mémoire dans la base de données
      const memory = await prisma.memory.create({
        data: {
          content,
          type,
          userId,
        },
      });
      
      // Créer le vecteur dans Pinecone
      await index.upsert({
        id: memory.id,
        values: embedding,
        metadata: {
          content,
          type,
          memoryId: memory.id,
        },
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

      // Créer l'embedding pour la requête
      const queryEmbedding = await this.openAIService.createEmbedding(query);
      
      // Obtenir l'index Pinecone
      const index = this.pinecone.Index(this.indexName);
      
      // Rechercher les vecteurs similaires
      const queryResult = await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true,
      });
      
      if (!queryResult.matches || queryResult.matches.length === 0) {
        return [];
      }
      
      // Récupérer les mémoires correspondantes depuis la base de données
      const memoryIds = queryResult.matches.map((match) => match.id);
      
      const memories = await prisma.memory.findMany({
        where: {
          id: {
            in: memoryIds,
          },
        },
      });
      
      // Trier les mémoires dans le même ordre que les résultats de la recherche
      const sortedMemories = memoryIds.map((id) => {
        const memory = memories.find((m) => m.id === id);
        return memory ? {
          id: memory.id,
          content: memory.content,
          type: memory.type,
          vectorId: memory.vectorId || undefined,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt,
        } : null;
      }).filter((m): m is Memory => m !== null);
      
      return sortedMemories;
    } catch (error) {
      console.error('Erreur lors de la recherche de similarité:', error);
      return [];
    }
  }

  // Supprimer une mémoire
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      // Supprimer de la base de données
      await prisma.memory.delete({
        where: { id: memoryId },
      });
      
      // Supprimer de Pinecone si un vectorId existe
      const index = this.pinecone.Index(this.indexName);
      await index.delete({ ids: [memoryId] });
      
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

      // Mettre à jour dans la base de données
      const updateData: { content: string; type?: string } = { content };
      if (type) updateData.type = type;
      
      const updatedMemory = await prisma.memory.update({
        where: { id: memoryId },
        data: updateData,
      });
      
      // Créer le nouvel embedding
      const newEmbedding = await this.openAIService.createEmbedding(content);
      
      // Mettre à jour dans Pinecone
      const index = this.pinecone.Index(this.indexName);
      await index.upsert({
        id: memoryId,
        values: newEmbedding,
        metadata: {
          content,
          type: updatedMemory.type,
          memoryId: updatedMemory.id,
        },
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