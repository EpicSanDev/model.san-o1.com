import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient } from '../../../../lib/google';
import { getServerSession } from 'next-auth';

export async function GET(request: Request) {
  try {
    // Récupérer la session utilisateur
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    // Extraire les paramètres de filtre de l'URL
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    
    // Configurer le client OAuth
    const oauth2Client = await getOAuthClient(session.user);
    
    if (!oauth2Client) {
      return NextResponse.json({ error: 'Impossible de se connecter à Google. Veuillez vérifier vos autorisations.' }, { status: 401 });
    }
    
    // Créer l'instance du client Gmail
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Construire la requête en fonction du filtre
    let q = '';
    
    switch (filter) {
      case 'unread':
        q = 'is:unread';
        break;
      case 'important':
        q = 'is:important';
        break;
      default:
        q = '';
    }
    
    // Récupérer la liste des emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      q
    });
    
    if (!response.data.messages || response.data.messages.length === 0) {
      return NextResponse.json([]);
    }
    
    // Récupérer les détails de chaque email
    const emails = await Promise.all(
      response.data.messages.map(async (message) => {
        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: message.id as string,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });
        
        const headers = messageData.data.payload?.headers;
        const labels = messageData.data.labelIds || [];
        
        // Extraire les informations des headers
        const from = headers?.find(h => h.name === 'From')?.value || '';
        const subject = headers?.find(h => h.name === 'Subject')?.value || '';
        const date = headers?.find(h => h.name === 'Date')?.value || '';
        
        // Déterminer si l'email est lu ou important
        const isRead = !labels.includes('UNREAD');
        const isImportant = labels.includes('IMPORTANT');
        
        return {
          id: message.id,
          from,
          subject,
          date,
          snippet: messageData.data.snippet || '',
          isRead,
          isImportant,
          labels
        };
      })
    );
    
    return NextResponse.json(emails);
  } catch (error) {
    console.error('Erreur lors de la récupération des emails:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des emails' }, { status: 500 });
  }
} 