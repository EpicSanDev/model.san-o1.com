import { NextRequest, NextResponse } from 'next/server';
import { getVectorStore } from '../../../lib/vectorStore';

export async function GET(request: NextRequest) {
  try {
    // Récupérer la requête de recherche depuis les paramètres d'URL
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Une requête de recherche est requise.' },
        { status: 400 }
      );
    }
    
    // Récupérer la limite (nombre de résultats) si spécifiée
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    
    // Initialiser le service vectoriel
    const vectorStore = await getVectorStore();
    
    // Effectuer la recherche de similarité
    const memories = await vectorStore.similaritySearch(query, limit);
    
    return NextResponse.json(memories);
  } catch (error) {
    console.error('Erreur lors de la recherche dans les mémoires:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la recherche dans les mémoires.' },
      { status: 500 }
    );
  }
} 