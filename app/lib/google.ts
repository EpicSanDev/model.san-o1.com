import { google, Auth } from 'googleapis';

// Configuration des paramètres d'authentification Google
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Récupérer les variables d'environnement pour l'authentification
const getOAuthConfig = (): OAuthConfig => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.NEXTAUTH_URL 
    ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    : 'http://localhost:3000/api/auth/callback/google';

  if (!clientId || !clientSecret) {
    throw new Error('Identifiants OAuth Google manquants dans les variables d\'environnement');
  }

  return {
    clientId,
    clientSecret,
    redirectUri
  };
};

// Créer un nouveau client OAuth2
export const createOAuthClient = (): Auth.OAuth2Client => {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// Récupérer un client OAuth prêt à l'emploi en utilisant les tokens de session
export const getOAuthClient = async (user: any): Promise<Auth.OAuth2Client | null> => {
  try {
    // Vérifier que l'utilisateur a des tokens Google
    if (!user?.tokens?.google) {
      console.error('Pas de token Google disponible pour l\'utilisateur');
      return null;
    }

    const oauth2Client = createOAuthClient();
    const { accessToken, refreshToken, expiry } = user.tokens.google;

    // Configurer le client avec les tokens existants
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiry
    });

    // Vérifier si le token a expiré
    const isTokenExpired = expiry ? expiry < Date.now() : true;

    // Rafraîchir le token si nécessaire
    if (isTokenExpired && refreshToken) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Mettre à jour les tokens dans la session (via la base de données)
        await updateUserTokens(user.id, {
          accessToken: credentials.access_token!,
          refreshToken: credentials.refresh_token || refreshToken,
          expiry: credentials.expiry_date!
        });
        
        // Mettre à jour le client avec les nouveaux tokens
        oauth2Client.setCredentials(credentials);
      } catch (error) {
        console.error('Erreur lors du rafraichissement du token:', error);
        return null;
      }
    }

    return oauth2Client;
  } catch (error) {
    console.error('Erreur lors de la récupération du client OAuth:', error);
    return null;
  }
};

// Mettre à jour les tokens de l'utilisateur dans la base de données
async function updateUserTokens(userId: string, tokens: { accessToken: string; refreshToken: string; expiry: number }) {
  try {
    // Appel à la base de données pour mettre à jour les tokens
    // Cette implémentation dépendra de votre système de stockage
    // Exemple avec Prisma:
    /*
    await prisma.user.update({
      where: { id: userId },
      data: {
        tokens: {
          update: {
            google: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiry: tokens.expiry
            }
          }
        }
      }
    });
    */
    
    // Placeholder - à remplacer par votre logique de stockage réelle
    console.log(`Tokens mis à jour pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des tokens:', error);
    throw error;
  }
}

// Générer l'URL d'autorisation pour la connexion Google
export const generateAuthUrl = (scopes: string[] = []): string => {
  const oauth2Client = createOAuthClient();
  
  const defaultScopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];
  
  // Ajouter les scopes par défaut si non fournis
  const allScopes = scopes.length > 0
    ? scopes
    : [...defaultScopes, 
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar'
      ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: allScopes
  });
}; 