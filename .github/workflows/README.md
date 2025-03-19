# Workflow CI/CD pour Digital Ocean

Ce workflow automatise le déploiement de l'application sur Digital Ocean Kubernetes Service (DOKS). Il effectue les opérations suivantes:

1. Compilation de l'application
2. Construction et publication de l'image Docker sur Digital Ocean Container Registry
3. Déploiement sur un cluster Kubernetes
4. Gestion intelligente des déploiements existants

## Prérequis

Avant de pouvoir utiliser ce workflow, vous devez configurer les secrets suivants dans les paramètres de votre dépôt GitHub:

### Secrets pour Digital Ocean

- `DIGITALOCEAN_ACCESS_TOKEN`: Token d'accès à l'API Digital Ocean
- `DO_CLUSTER_NAME`: Nom de votre cluster Kubernetes sur Digital Ocean
- `DO_API_TOKEN_NAME`: Nom du token API Digital Ocean (généralement votre email)
- `DO_EMAIL`: Email associé à votre compte Digital Ocean

### Secrets pour l'application

- `DATABASE_URL`: URL de connexion à la base de données
- `OPENAI_API_KEY`: Clé API OpenAI
- `PINECONE_API_KEY`: Clé API Pinecone
- `PINECONE_ENVIRONMENT`: Environnement Pinecone
- `PINECONE_INDEX`: Index Pinecone
- `NEXTAUTH_SECRET`: Secret pour NextAuth
- `NEXTAUTH_URL`: URL pour NextAuth
- `GOOGLE_CLIENT_ID`: ID client Google pour l'authentification
- `GOOGLE_CLIENT_SECRET`: Secret client Google pour l'authentification

## Fonctionnement

Le workflow est déclenché automatiquement lors d'un push sur les branches `main` ou `master`. Il peut également être lancé manuellement depuis l'interface GitHub Actions.

### Comportement intelligent

- **Gestion des déploiements**: Le workflow vérifie si un déploiement existe déjà et adapte son comportement en conséquence.
- **Nettoyage des anciennes images**: Les anciennes images Docker sont automatiquement supprimées du registry (en gardant les 3 plus récentes).
- **Mise à jour des secrets**: Les secrets Kubernetes sont mis à jour si nécessaire.

## Personnalisation

Vous pouvez personnaliser ce workflow en modifiant les éléments suivants:

- `IMAGE_NAME`: Le nom de l'image Docker (par défaut, basé sur le nom du dépôt)
- `K8S_NAMESPACE`: L'espace de noms Kubernetes utilisé (par défaut: "default")
- Le nombre d'images conservées dans le registry (modifiez la ligne `tail -n +4` pour conserver plus ou moins d'images)

## Dépannage

Si le workflow échoue, vérifiez les points suivants:

1. Assurez-vous que tous les secrets sont correctement configurés
2. Vérifiez que votre cluster Kubernetes est accessible
3. Vérifiez que les permissions du token Digital Ocean sont suffisantes
4. Consultez les logs de déploiement pour plus de détails sur les erreurs

## Déploiement manuel

Vous pouvez également déclencher un déploiement manuellement en utilisant l'option "workflow_dispatch" depuis l'onglet Actions de GitHub. 