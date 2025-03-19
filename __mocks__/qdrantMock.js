/**
 * Mock pour @qdrant/js-client-rest
 * Ce fichier imite l'interface principale du client Qdrant pour les tests
 */

// Classe mock pour QdrantClient
class QdrantClient {
  constructor(config) {
    this.config = config;
    this.collectionsData = [];
    this.pointsData = {};
  }

  // Méthodes de collections
  async getCollections() {
    return {
      collections: this.collectionsData.length > 0 
        ? this.collectionsData 
        : [{ name: 'test-collection' }]
    };
  }

  async createCollection(collectionName, config) {
    this.collectionsData.push({ name: collectionName, config });
    return { result: true, status: 'ok' };
  }

  // Méthodes pour les points vectoriels
  async upsert(collectionName, points) {
    if (!this.pointsData[collectionName]) {
      this.pointsData[collectionName] = [];
    }
    
    // Ajouter ou mettre à jour les points
    if (Array.isArray(points.points)) {
      points.points.forEach(point => {
        const index = this.pointsData[collectionName].findIndex(p => p.id === point.id);
        if (index >= 0) {
          this.pointsData[collectionName][index] = point;
        } else {
          this.pointsData[collectionName].push(point);
        }
      });
    }
    
    return { result: true, status: 'ok', operation_id: 123 };
  }

  async search(collectionName, searchParams) {
    return {
      points: [
        {
          id: 'memory1',
          score: 0.9,
          payload: {
            content: 'Premier souvenir important',
            type: 'general',
            memoryId: 'memory1',
          },
        },
        {
          id: 'memory2',
          score: 0.8,
          payload: {
            content: 'Deuxième souvenir important',
            type: 'general',
            memoryId: 'memory2',
          },
        },
      ]
    };
  }

  async delete(collectionName, filter) {
    if (!this.pointsData[collectionName]) return { result: true };
    
    if (filter.points) {
      // Supprimer les points spécifiés
      this.pointsData[collectionName] = this.pointsData[collectionName]
        .filter(point => !filter.points.includes(point.id));
    }
    
    return { result: true, status: 'ok' };
  }
}

// Exporter la classe et toute autre fonction nécessaire
module.exports = {
  QdrantClient
}; 