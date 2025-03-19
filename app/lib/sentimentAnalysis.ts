import { OpenAIService } from './openai';

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; // -1 à 1
  dominantEmotions: string[];
  confidence: number; // 0 à 1
}

export interface IntentAnalysisResult {
  primaryIntent: string;
  secondaryIntents: string[];
  actionRequired: boolean;
  urgencyLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0 à 1
}

export class SentimentAnalysisService {
  private openAIService: OpenAIService;
  
  constructor() {
    this.openAIService = new OpenAIService();
  }
  
  /**
   * Analyse le sentiment d'un texte
   * @param text Texte à analyser
   * @returns Résultat de l'analyse de sentiment
   */
  async analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
    const prompt = `
      Analysez le sentiment et les émotions du texte suivant:
      
      "${text}"
      
      Répondez au format JSON avec les champs suivants:
      - sentiment: "positive", "negative", ou "neutral"
      - sentimentScore: nombre entre -1 (très négatif) et 1 (très positif)
      - dominantEmotions: tableau des émotions dominantes (max 3)
      - confidence: nombre entre 0 et 1 indiquant la confiance de l'analyse
    `;
    
    try {
      const response = await this.openAIService.generateText({
        messages: [
          {
            role: 'system',
            content: 'Vous êtes un expert en analyse de sentiment et d\'émotion. Vous analysez le texte fourni de manière objective et précise. Vous répondez uniquement au format JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.text) as SentimentAnalysisResult;
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'analyse de sentiment:', error);
      // Valeur par défaut en cas d'erreur
      return {
        sentiment: 'neutral',
        sentimentScore: 0,
        dominantEmotions: [],
        confidence: 0
      };
    }
  }
  
  /**
   * Analyse l'intention derrière un texte
   * @param text Texte à analyser
   * @returns Résultat de l'analyse d'intention
   */
  async analyzeIntent(text: string): Promise<IntentAnalysisResult> {
    const prompt = `
      Analysez l'intention derrière le texte suivant:
      
      "${text}"
      
      Répondez au format JSON avec les champs suivants:
      - primaryIntent: intention principale identifiée
      - secondaryIntents: tableau des intentions secondaires (max 2)
      - actionRequired: booléen indiquant si une action est nécessaire
      - urgencyLevel: "low", "medium", ou "high"
      - confidence: nombre entre 0 et 1 indiquant la confiance de l'analyse
    `;
    
    try {
      const response = await this.openAIService.generateText({
        messages: [
          {
            role: 'system',
            content: 'Vous êtes un expert en analyse d\'intention. Vous identifiez l\'objectif principal et les intentions secondaires derrière le texte fourni. Vous répondez uniquement au format JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.text) as IntentAnalysisResult;
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'analyse d\'intention:', error);
      // Valeur par défaut en cas d'erreur
      return {
        primaryIntent: 'unknown',
        secondaryIntents: [],
        actionRequired: false,
        urgencyLevel: 'low',
        confidence: 0
      };
    }
  }
  
  /**
   * Effectue une analyse complète (sentiment et intention) d'un texte
   * @param text Texte à analyser
   * @returns Résultats combinés des analyses de sentiment et d'intention
   */
  async analyzeText(text: string): Promise<{
    sentiment: SentimentAnalysisResult;
    intent: IntentAnalysisResult;
  }> {
    // Exécuter les deux analyses en parallèle pour plus d'efficacité
    const [sentimentResult, intentResult] = await Promise.all([
      this.analyzeSentiment(text),
      this.analyzeIntent(text)
    ]);
    
    return {
      sentiment: sentimentResult,
      intent: intentResult
    };
  }
} 