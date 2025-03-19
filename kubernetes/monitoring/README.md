# Monitoring Kubernetes avec Prometheus et Grafana

Ce répertoire contient les configurations Kubernetes nécessaires pour déployer une solution de monitoring complète basée sur Prometheus et Grafana, avec une base de données vectorielle Qdrant pour stocker et rechercher les événements du calendrier.

## Architecture

L'architecture de monitoring comprend :

- **Prometheus** : Collecte et stocke les métriques
- **Grafana** : Visualise les métriques et crée des tableaux de bord
- **Qdrant** : Base de données vectorielle pour la recherche sémantique des événements du calendrier

## Prérequis

- Un cluster Kubernetes opérationnel
- kubectl installé et configuré
- Un contrôleur Ingress dans le cluster (nginx-ingress recommandé)

## Installation

1. Créer le namespace de monitoring :

```bash
kubectl apply -f namespace.yaml
```

2. Déployer Prometheus :

```bash
kubectl apply -f prometheus-config.yaml
```

3. Déployer Grafana :

```bash
kubectl apply -f grafana-config.yaml
```

4. Déployer Qdrant :

```bash
kubectl apply -f qdrant-deployment.yaml
```

## Accès aux interfaces

Une fois déployés, vous pouvez accéder aux interfaces web :

- **Prometheus** : http://prometheus.san-o1.com (ou via le service `prometheus:9090` à l'intérieur du cluster)
- **Grafana** : http://grafana.san-o1.com (identifiants par défaut : admin/admin123)
- **Qdrant** : http://qdrant.san-o1.com (API REST sur le port 6333)

## Configuration de Grafana

Après l'installation, connectez-vous à Grafana et :

1. Créez des tableaux de bord pour visualiser :
   - Les métriques du cluster Kubernetes
   - Les performances de l'application San-O1
   - Les métriques de Qdrant

2. Configurer des alertes pour :
   - Utilisation élevée du CPU ou de la mémoire
   - Latence élevée des requêtes
   - Erreurs d'application

## Qdrant pour la recherche d'événements

Qdrant est utilisé comme base de données vectorielle pour indexer et rechercher des événements du calendrier de manière sémantique. Le service est accessible via :

- Port HTTP : 6333
- Port gRPC : 6334

## Maintenance

### Sauvegardes

Il est recommandé de configurer des sauvegardes régulières pour :

- Les données Prometheus (PVC prometheus-storage)
- La configuration et les tableaux de bord Grafana (PVC grafana-storage)
- Les collections Qdrant (PVC qdrant-storage)

### Mise à jour des versions

Pour mettre à jour les versions des composants :

1. Modifier l'image dans le fichier de déploiement correspondant
2. Appliquer les modifications avec `kubectl apply -f <fichier-yaml>`

## Résolution des problèmes

### Prometheus ne collecte pas les métriques

1. Vérifier que les cibles sont accessibles : `kubectl port-forward -n monitoring svc/prometheus 9090:9090`
2. Ouvrir http://localhost:9090/targets dans votre navigateur

### Grafana ne se connecte pas à Prometheus

1. Vérifier la configuration de la source de données dans le ConfigMap grafana-datasources
2. S'assurer que le service Prometheus est accessible depuis Grafana 