import { SentimentAnalysisService, SentimentAnalysisResult, IntentAnalysisResult } from '../../app/lib/sentimentAnalysis';
import { OpenAIService } from '../../app/lib/openai';

// Mock de OpenAIService
jest.mock('../../app/lib/openai');

// Réponses simulées
const mockSentimentResponse = {
  text: JSON.stringify({
    sentiment: 'positive',
    sentimentScore: 0.85,
    dominantEmotions: ['joie', 'satisfaction', 'enthousiasme'],
    confidence: 0.92
  })
};

const mockIntentResponse = {
  text: JSON.stringify({
    primaryIntent: 'demande_information',
    secondaryIntents: ['exprimer_opinion', 'suggérer_idée'],
    actionRequired: true,
    urgencyLevel: 'medium',
    confidence: 0.87
  })
};

// Configuration du mock
const mockGenerateText = jest.fn();
(OpenAIService as jest.MockedClass<typeof OpenAIService>).prototype.generateText = mockGenerateText;

describe('SentimentAnalysisService', () => {
  let sentimentService: SentimentAnalysisService;
  
  beforeEach(() => {
    // Réinitialiser les mocks
    jest.clearAllMocks();
    
    // Créer une nouvelle instance du service
    sentimentService = new SentimentAnalysisService();
    
    // Configurer les réponses simulées
    mockGenerateText.mockImplementation((params) => {
      const content = params.messages[params.messages.length - 1].content;
      
      if (content.includes('Analysez le sentiment')) {
        return Promise.resolve(mockSentimentResponse);
      } else if (content.includes('Analysez l\'intention')) {
        return Promise.resolve(mockIntentResponse);
      }
      
      return Promise.reject(new Error('Requête non reconnue'));
    });
  });
  
  test('analyzeSentiment() - Analyse correctement le sentiment d\'un texte', async () => {
    const text = 'Je suis vraiment ravi de la qualité de ce produit, il dépasse toutes mes attentes !';
    
    const result = await sentimentService.analyzeSentiment(text);
    
    // Vérifier que OpenAI a été appelé avec les bons paramètres
    expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining(text)
        })
      ]),
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }));
    
    // Vérifier que le résultat correspond à la réponse simulée
    expect(result).toEqual({
      sentiment: 'positive',
      sentimentScore: 0.85,
      dominantEmotions: ['joie', 'satisfaction', 'enthousiasme'],
      confidence: 0.92
    });
  });
  
  test('analyzeIntent() - Analyse correctement l\'intention d\'un texte', async () => {
    const text = 'Pourriez-vous me fournir plus d\'informations sur ce sujet ? Je pense qu\'il pourrait être intéressant d\'explorer cette piste.';
    
    const result = await sentimentService.analyzeIntent(text);
    
    // Vérifier que OpenAI a été appelé avec les bons paramètres
    expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining(text)
        })
      ]),
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }));
    
    // Vérifier que le résultat correspond à la réponse simulée
    expect(result).toEqual({
      primaryIntent: 'demande_information',
      secondaryIntents: ['exprimer_opinion', 'suggérer_idée'],
      actionRequired: true,
      urgencyLevel: 'medium',
      confidence: 0.87
    });
  });
  
  test('analyzeText() - Effectue les deux analyses en parallèle', async () => {
    const text = 'Je suis très satisfait du service, mais j\'aimerais avoir plus d\'informations sur les fonctionnalités avancées.';
    
    const result = await sentimentService.analyzeText(text);
    
    // Vérifier que les deux méthodes ont été appelées
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    
    // Vérifier la structure du résultat combiné
    expect(result).toEqual({
      sentiment: {
        sentiment: 'positive',
        sentimentScore: 0.85,
        dominantEmotions: ['joie', 'satisfaction', 'enthousiasme'],
        confidence: 0.92
      },
      intent: {
        primaryIntent: 'demande_information',
        secondaryIntents: ['exprimer_opinion', 'suggérer_idée'],
        actionRequired: true,
        urgencyLevel: 'medium',
        confidence: 0.87
      }
    });
  });
  
  test('Gère correctement les erreurs dans analyzeSentiment()', async () => {
    // Simuler une erreur
    mockGenerateText.mockRejectedValueOnce(new Error('Erreur API'));
    
    const text = 'Texte pour test d\'erreur';
    const result = await sentimentService.analyzeSentiment(text);
    
    // Vérifier que la valeur par défaut est retournée
    expect(result).toEqual({
      sentiment: 'neutral',
      sentimentScore: 0,
      dominantEmotions: [],
      confidence: 0
    });
  });
  
  test('Gère correctement les erreurs dans analyzeIntent()', async () => {
    // Simuler une erreur
    mockGenerateText.mockRejectedValueOnce(new Error('Erreur API'));
    
    const text = 'Texte pour test d\'erreur';
    const result = await sentimentService.analyzeIntent(text);
    
    // Vérifier que la valeur par défaut est retournée
    expect(result).toEqual({
      primaryIntent: 'unknown',
      secondaryIntents: [],
      actionRequired: false,
      urgencyLevel: 'low',
      confidence: 0
    });
  });
}); 