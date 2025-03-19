import { NextRequest, NextResponse } from 'next/server';
import { getVectorStore } from '../../lib/vectorStore';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obtenir toutes les mémoires
export async function GET() {
  try {
    // Pour une version réelle avec authentification, nous filtrerions par userId
    const memories = await prisma.memory.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    return NextResponse.json(memories);
  } catch (error) {
    console.error('Erreur lors de la récupération des mémoires:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des mémoires.' },
      { status: 500 }
    );
  }
}

// Créer une nouvelle mémoire
export async function POST(request: NextRequest) {
  try {
    const { content, type = 'general' } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Le contenu est requis.' },
        { status: 400 }
      );
    }
    
    // Dans une application réelle, nous récupérerions l'ID d'utilisateur depuis la session
    const userId = 'default-user';
    
    // Initialiser le service vectoriel
    const vectorStore = await getVectorStore();
    
    // Ajouter la mémoire
    const memory = await vectorStore.addMemory(content, type, userId);
    
    return NextResponse.json(memory);
  } catch (error) {
    console.error('Erreur lors de la création de la mémoire:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la création de la mémoire.' },
      { status: 500 }
    );
  }
}

// Supprimer une mémoire
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'L\'identifiant de la mémoire est requis.' },
        { status: 400 }
      );
    }
    
    // Initialiser le service vectoriel
    const vectorStore = await getVectorStore();
    
    // Supprimer la mémoire
    const success = await vectorStore.deleteMemory(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la mémoire.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de la mémoire:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la mémoire.' },
      { status: 500 }
    );
  }
}

// Mettre à jour une mémoire
export async function PUT(request: NextRequest) {
  try {
    const { id, content, type } = await request.json();
    
    if (!id || !content) {
      return NextResponse.json(
        { error: 'L\'identifiant et le contenu sont requis.' },
        { status: 400 }
      );
    }
    
    // Initialiser le service vectoriel
    const vectorStore = await getVectorStore();
    
    // Mettre à jour la mémoire
    const memory = await vectorStore.updateMemory(id, content, type);
    
    if (!memory) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la mémoire.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(memory);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la mémoire:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la mémoire.' },
      { status: 500 }
    );
  }
} 