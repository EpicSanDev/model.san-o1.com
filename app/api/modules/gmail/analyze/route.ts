import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { processWithAI } from '../../../../lib/openai';

export async function POST(request: Request) {
  try {
    // Récupérer la session utilisateur
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Récupérer les emails à analyser
    const { emails } = await request.json();
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Aucun email à analyser' },
        { status: 400 }
      );
    }
    
    // Formater les données pour l'analyse
    const emailsForAnalysis = emails.map(email => ({
      from: email.from,
      subject: email.subject,
      date: email.date,
      snippet: email.snippet,
      isRead: email.isRead,
      isImportant: email.isImportant
    }));
    
    // Construire le prompt pour l'IA
    const prompt = `
      Tu es un assistant d'analyse d'emails professionnel. Analyse les ${emails.length} emails suivants et fournis:
      1. Un résumé global de l'ensemble des emails
      2. Une identification des emails qui semblent importants ou urgents
      3. Une classification thématique des emails
      4. Des suggestions d'actions ou de réponses pour l'utilisateur

      Voici les emails à analyser (format JSON):
      ${JSON.stringify(emailsForAnalysis, null, 2)}
      
      Ta réponse doit être structurée, complète et directement utilisable par l'utilisateur.
    `;
    
    // Analyser avec l'IA
    const analysis = await processWithAI(prompt, 'gpt-4o');
    
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Erreur lors de l\'analyse des emails:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse des emails' },
      { status: 500 }
    );
  }
} 