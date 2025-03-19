import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';

// Configuration des clients
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Nom de la collection pour les événements du calendrier
const COLLECTION_NAME = 'calendar_events';

// Dimension des vecteurs pour le modèle d'embedding d'OpenAI
const VECTOR_DIMENSION = 1536; // Pour text-embedding-ada-002

// Initialiser la collection Qdrant si elle n'existe pas
export async function initializeQdrantCollection() {
  try {
    // Vérifier si la collection existe
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(
      (collection) => collection.name === COLLECTION_NAME
    );

    if (!collectionExists) {
      // Créer la collection
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_DIMENSION,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      // Créer les indices pour la recherche
      await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'title',
        field_schema: 'keyword',
        wait: true,
      });

      await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
        field_name: 'description',
        field_schema: 'text',
        wait: true,
      });

      console.log('Collection Qdrant initialisée avec succès');
    } else {
      console.log('Collection Qdrant existe déjà');
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la collection Qdrant:', error);
    return false;
  }
}

// Générer un embedding pour un texte
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  
  return response.data[0].embedding;
}

// Indexer un événement de calendrier dans Qdrant
export async function indexCalendarEvent(event: any) {
  try {
    // Préparer le texte pour l'embedding
    const text = `${event.title} ${event.description || ''}`;
    
    // Obtenir l'embedding du texte
    const embedding = await getEmbedding(text);
    
    // Préparer le payload
    const payload = {
      id: event.id,
      title: event.title,
      description: event.description || '',
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      location: event.location || '',
      isAllDay: event.isAllDay || false,
      userId: event.userId,
    };
    
    // Indexer dans Qdrant
    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: event.id,
          vector: embedding,
          payload: payload,
        },
      ],
    });
    
    console.log(`Événement indexé avec succès: ${event.id}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'indexation de l\'événement:', error);
    return false;
  }
}

// Supprimer un événement de Qdrant
export async function deleteCalendarEventVector(eventId: string) {
  try {
    await qdrantClient.delete(COLLECTION_NAME, {
      wait: true,
      points: [eventId],
    });
    
    console.log(`Événement supprimé avec succès de Qdrant: ${eventId}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement de Qdrant:', error);
    return false;
  }
}

// Rechercher des événements similaires à une requête
export async function searchSimilarEvents(query: string, userId: string, limit: number = 5) {
  try {
    // Obtenir l'embedding de la requête
    const embedding = await getEmbedding(query);
    
    // Rechercher dans Qdrant
    const searchResult = await qdrantClient.search(COLLECTION_NAME, {
      vector: embedding,
      limit: limit,
      filter: {
        must: [
          {
            key: 'userId',
            match: {
              value: userId,
            },
          },
        ],
      },
    });
    
    // Transformer les résultats
    return searchResult.map((result) => ({
      ...result.payload,
      score: result.score,
      start: new Date(result.payload.start as string),
      end: new Date(result.payload.end as string),
    }));
  } catch (error) {
    console.error('Erreur lors de la recherche d\'événements similaires:', error);
    return [];
  }
} 