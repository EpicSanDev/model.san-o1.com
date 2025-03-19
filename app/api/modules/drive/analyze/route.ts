import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';

// Fonction helper pour obtenir un client Google Auth
const getGoogleAuthClient = async () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL || 'http://localhost:3000/api/auth/callback/google'
  );
  
  // Ici, vous devriez normalement récupérer l'utilisateur et ses tokens depuis la session
  // Pour l'instant, nous allons utiliser une approche simplifiée pour le build
  return oauth2Client;
};

// Classe simplifiée OpenAIService
class OpenAIService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }
  
  async generateText({ messages, temperature = 0.7, max_tokens = 500 }: { 
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    temperature?: number; 
    max_tokens?: number 
  }): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature,
      max_tokens,
    });
    
    return completion.choices[0].message.content || '';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Récupérer les données de la requête
    const body = await request.json();
    const { fileIds } = body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier spécifié pour l\'analyse' },
        { status: 400 }
      );
    }
    
    // Initialiser les services
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    const openAIService = new OpenAIService();
    
    // Récupérer les informations sur les fichiers sélectionnés
    const filesData = await Promise.all(
      fileIds.map(async (fileId) => {
        try {
          // Récupérer les métadonnées du fichier
          const fileResponse = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, createdTime, modifiedTime, size, webViewLink, owners',
          });
          
          const file = fileResponse.data;
          
          // Extraire le contenu du fichier pour les types supportés
          let content = '';
          
          if (file.mimeType === 'application/pdf') {
            // Pour les PDF, utiliser l'export API pour obtenir le texte
            const exportResponse = await drive.files.export({
              fileId,
              mimeType: 'text/plain',
            });
            
            content = exportResponse.data.toString();
          } else if (
            file.mimeType === 'text/plain' || 
            file.mimeType === 'application/rtf' ||
            file.mimeType === 'text/html' ||
            file.mimeType === 'application/json' ||
            file.mimeType === 'application/xml'
          ) {
            // Pour les fichiers texte, télécharger directement
            const contentResponse = await drive.files.get({
              fileId,
              alt: 'media',
            });
            
            content = contentResponse.data.toString();
          } else if (
            file.mimeType === 'application/vnd.google-apps.document' ||
            file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
            file.mimeType === 'application/vnd.google-apps.presentation'
          ) {
            // Pour les documents Google, exporter en texte
            const exportResponse = await drive.files.export({
              fileId,
              mimeType: 'text/plain',
            });
            
            content = exportResponse.data.toString();
          }
          
          // Limiter la taille du contenu pour éviter les problèmes avec l'API OpenAI
          if (content.length > 10000) {
            content = content.substring(0, 10000) + '... (contenu tronqué)';
          }
          
          return {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            size: file.size,
            webViewLink: file.webViewLink,
            owners: file.owners || [],
            content,
          };
        } catch (error) {
          console.error(`Erreur lors de la récupération du fichier ${fileId}:`, error);
          return {
            id: fileId,
            error: 'Impossible de récupérer ce fichier',
          };
        }
      })
    );
    
    // Filtrer les fichiers qui ont été récupérés avec succès
    const validFiles = filesData.filter(file => !file.error);
    
    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier valide pour l\'analyse' },
        { status: 400 }
      );
    }
    
    // Créer un prompt pour OpenAI
    const prompt = `
      Je vous fournis des informations sur ${validFiles.length} fichier(s) provenant de Google Drive.
      Pour chaque fichier, je vous donne son nom, son type, sa date de création et de modification, ainsi qu'un extrait de son contenu si disponible.
      Veuillez analyser ces fichiers et fournir:
      1. Un résumé de chaque fichier (son sujet, ses points clés)
      2. Les thèmes ou sujets communs entre ces fichiers
      3. Des observations ou des insights intéressants
      4. Des recommandations sur la façon d'utiliser ou d'améliorer ces documents
      
      Voici les fichiers:
      
      ${validFiles.map((file, index) => `
        FICHIER ${index + 1}:
        Nom: ${file.name}
        Type: ${file.mimeType}
        Créé le: ${new Date(file.createdTime as string).toLocaleString('fr-FR')}
        Modifié le: ${new Date(file.modifiedTime as string).toLocaleString('fr-FR')}
        Contenu:
        ${file.content || '[Contenu non disponible pour ce type de fichier]'}
      `).join('\n\n')}
    `;
    
    // Envoyer la demande à OpenAI pour analyse
    const analysisResponse = await openAIService.generateText({
      messages: [
        {
          role: 'system',
          content: 'Vous êtes un assistant spécialisé dans l\'analyse de documents. Votre mission est d\'extraire les informations importantes des fichiers et de les présenter de manière claire et concise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });
    
    // Retourner les résultats
    return NextResponse.json({
      files: validFiles.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType
      })),
      analysis: analysisResponse,
    });
  } catch (error) {
    console.error('Erreur lors de l\'analyse des fichiers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse des fichiers' },
      { status: 500 }
    );
  }
} 