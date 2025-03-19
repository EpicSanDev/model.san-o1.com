import { NextRequest, NextResponse } from 'next/server';
import { SentimentAnalysisService } from '@/app/lib/sentimentAnalysis';

/**
 * Endpoint pour l'analyse de sentiment d'un texte
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Le paramètre "text" est requis et doit être une chaîne de caractères' },
        { status: 400 }
      );
    }
    
    // Limiter la taille du texte pour éviter les abus
    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Le texte ne doit pas dépasser 10 000 caractères' },
        { status: 400 }
      );
    }
    
    const sentimentService = new SentimentAnalysisService();
    const result = await sentimentService.analyzeSentiment(text);
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Erreur lors de l\'analyse de sentiment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse de sentiment' },
      { status: 500 }
    );
  }
} 