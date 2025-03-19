import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

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

export async function GET(request: NextRequest) {
  try {
    // Récupérer les paramètres de la requête
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || 'root';
    
    // Initialiser le client Google Auth
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    // Requête pour les dossiers
    const foldersResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime)',
      orderBy: 'name',
    });
    
    // Requête pour les fichiers (non-dossiers)
    const filesResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink, iconLink, owners, shared)',
      orderBy: 'modifiedTime desc',
    });
    
    // Mapper les résultats pour les dossiers
    const folders = foldersResponse.data.files?.map(folder => ({
      id: folder.id,
      name: folder.name,
      path: [],
    })) || [];
    
    // Mapper les résultats pour les fichiers
    const files = filesResponse.data.files?.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      size: file.size,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink || `https://drive-thirdparty.googleusercontent.com/16/type/${file.mimeType}`,
      owners: file.owners || [],
      shared: file.shared || false,
    })) || [];
    
    return NextResponse.json({ folders, files });
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des fichiers' },
      { status: 500 }
    );
  }
} 