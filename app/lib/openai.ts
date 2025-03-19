import OpenAI from 'openai';
import { MemoryVectorStore } from './vectorStore';

// Initialiser le client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Modèle à utiliser pour les requêtes
const DEFAULT_MODEL = 'gpt-4o';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MemoryInfo {
  shouldRemember: boolean;
  memoryContent?: string;
  memoryType?: string;
}

export interface ChatResponse {
  response: string;
  shouldRemember: boolean;
  memoryContent?: string;
  memoryType?: string;
}

export class OpenAIService {
  private vectorStore: MemoryVectorStore;

  constructor(vectorStore: MemoryVectorStore) {
    this.vectorStore = vectorStore;
  }

  // Créer un embedding pour un texte
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Erreur lors de la création de l\'embedding:', error);
      throw error;
    }
  }

  // Analyser si une information doit être mémorisée
  private async analyzeForMemory(query: string, response: string): Promise<MemoryInfo> {
    try {
      const memoryAnalysisPrompt = `
        Tu dois analyser si cette interaction entre un utilisateur et un assistant IA contient des informations importantes à mémoriser.
        Question de l'utilisateur: "${query}"
        Réponse de l'assistant: "${response}"
        
        Si tu identifies une information importante à mémoriser (préférence, fait, date, etc.), réponds au format JSON:
        {
          "shouldRemember": true,
          "memoryContent": "L'information exacte à mémoriser",
          "memoryType": "Le type de mémoire (preference, fact, reminder, etc.)"
        }
        
        Sinon, réponds simplement:
        {
          "shouldRemember": false
        }
      `;

      const memoryAnalysis = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: 'Tu es un assistant qui analyse des conversations pour identifier les informations à mémoriser.' },
          { role: 'user', content: memoryAnalysisPrompt }
        ],
        response_format: { type: 'json_object' },
      });

      const analysisContent = memoryAnalysis.choices[0].message.content;
      
      if (!analysisContent) {
        return { shouldRemember: false };
      }
      
      return JSON.parse(analysisContent) as MemoryInfo;
    } catch (error) {
      console.error('Erreur lors de l\'analyse pour la mémoire:', error);
      return { shouldRemember: false };
    }
  }

  // Obtenir des mémoires pertinentes pour enrichir le contexte
  private async getRelevantMemories(query: string): Promise<string> {
    try {
      const memories = await this.vectorStore.similaritySearch(query, 5);
      
      if (memories.length === 0) {
        return '';
      }
      
      return `Informations pertinentes tirées de ta mémoire:\n${memories.map(m => `- ${m.content} (${m.type})`).join('\n')}`;
    } catch (error) {
      console.error('Erreur lors de la récupération des mémoires pertinentes:', error);
      return '';
    }
  }

  // Traiter une requête de chat
  async processChat(messages: Message[], query: string): Promise<ChatResponse> {
    try {
      // Obtenir des mémoires pertinentes
      const relevantMemories = await this.getRelevantMemories(query);
      
      // Construire les messages avec le contexte de la mémoire
      const contextualizedMessages: Message[] = [
        {
          role: 'system',
          content: `Tu es un assistant vocal IA personnel de nouvelle génération. Tu apprends et mémorises les interactions pour fournir un service personnalisé.
          ${relevantMemories ? `\n\n${relevantMemories}` : ''}
          
          Réponds toujours de manière concise, claire et personnalisée.`
        },
        ...messages
      ];

      // Appeler l'API OpenAI
      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: contextualizedMessages,
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content || '';
      
      // Analyser si cette information doit être mémorisée
      const memoryInfo = await this.analyzeForMemory(query, response);
      
      return {
        response,
        ...memoryInfo
      };
    } catch (error) {
      console.error('Erreur lors du traitement du chat:', error);
      throw error;
    }
  }
}

// Exporter une instance singleton
export const createOpenAIService = (vectorStore: MemoryVectorStore) => {
  return new OpenAIService(vectorStore);
}; 