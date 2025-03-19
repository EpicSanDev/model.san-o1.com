import { NextRequest, NextResponse } from 'next/server';
import { getVectorStore } from '../../lib/vectorStore';
import { createOpenAIService } from '../../lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages invalides. Un tableau de messages est requis.' },
        { status: 400 }
      );
    }
    
    // Obtenir le dernier message (question de l'utilisateur)
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Le dernier message doit être de l\'utilisateur.' },
        { status: 400 }
      );
    }
    
    // Initialiser les services
    const vectorStore = await getVectorStore();
    const openAIService = createOpenAIService(vectorStore);
    
    // Configurer la connexion bidirectionnelle pour éviter la référence circulaire
    vectorStore.setOpenAIService(openAIService);
    
    // Traiter la requête de chat
    const response = await openAIService.processChat(messages, lastMessage.content);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erreur lors du traitement de la requête chat:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la requête.' },
      { status: 500 }
    );
  }
} 