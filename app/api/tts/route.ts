import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';

// Initialiser le client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    // Vérifier l'authentification si nécessaire
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Récupérer les paramètres de la requête
    const { text, voice, model } = await req.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Le paramètre "text" est requis' },
        { status: 400 }
      );
    }
    
    // Valider les paramètres
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const validModels = ['tts-1', 'tts-1-hd'];
    
    const selectedVoice = validVoices.includes(voice) ? voice : 'alloy';
    const selectedModel = validModels.includes(model) ? model : 'tts-1';
    
    // Générer l'audio avec OpenAI
    const response = await openai.audio.speech.create({
      model: selectedModel,
      voice: selectedVoice,
      input: text,
      response_format: 'mp3'
    });
    
    // Récupérer le contenu audio
    const audioData = await response.arrayBuffer();
    
    // Créer une réponse avec le bon type MIME
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Erreur lors de la génération TTS OpenAI:', error);
    
    return NextResponse.json(
      { error: `Erreur lors de la génération audio: ${error.message || 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
} 