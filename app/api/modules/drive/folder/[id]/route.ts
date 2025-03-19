import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuthClient } from '@/app/lib/google';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const folderId = params.id;
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'ID de dossier non spécifié' },
        { status: 400 }
      );
    }
    
    // Initialiser le client Google Auth
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    // Récupérer les détails du dossier
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, parents',
    });
    
    const folder = response.data;
    
    // Vérifier que c'est bien un dossier
    if (folder.mimeType !== 'application/vnd.google-apps.folder') {
      return NextResponse.json(
        { error: 'Ce n\'est pas un dossier' },
        { status: 400 }
      );
    }
    
    // Récupérer le chemin complet du dossier (ses parents)
    const path = [];
    let currentParentId = folder.parents?.[0];
    
    // Limite à 10 niveaux pour éviter les boucles infinies
    for (let i = 0; i < 10 && currentParentId; i++) {
      try {
        const parentResponse = await drive.files.get({
          fileId: currentParentId,
          fields: 'id, name, parents',
        });
        
        const parent = parentResponse.data;
        path.unshift({
          id: parent.id,
          name: parent.name,
        });
        
        // Passer au parent du parent
        currentParentId = parent.parents?.[0];
        
        // Arrêter quand on atteint la racine
        if (currentParentId === 'root') break;
      } catch (error) {
        console.error(`Erreur lors de la récupération du parent ${currentParentId}:`, error);
        break;
      }
    }
    
    return NextResponse.json({
      id: folder.id,
      name: folder.name,
      path,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du dossier:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du dossier' },
      { status: 500 }
    );
  }
} 