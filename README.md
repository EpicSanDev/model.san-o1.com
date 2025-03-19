# Assistant Vocal IA Personnel

Assistant vocal IA personnel de nouvelle génération, modulaire et évolutif, intégrant les modèles OpenAI.

## Fonctionnalités principales

- **Mémoire à long terme** : Apprentissage et mémorisation des interactions via une base de données vectorielle
- **Interface web interactive** : Visualisation, modification et interrogation des informations stockées
- **Interaction vocale continue** : Écoute permanente et analyse en temps réel des commandes vocales
- **Modularité et évolutivité** : Ajout ou modification de modules pour étendre les capacités

## Prérequis

- Node.js (v18+)
- Compte OpenAI avec clé API
- Compte Pinecone (pour la base de données vectorielle)

## Installation

1. Cloner le dépôt :
```bash
git clone https://github.com/votre-utilisateur/ia-assistant-vocal.git
cd ia-assistant-vocal
```

2. Installer les dépendances :
```bash
npm install
```

3. Créer un fichier `.env` à la racine du projet avec les variables suivantes :
```
OPENAI_API_KEY=votre_clé_api_openai
PINECONE_API_KEY=votre_clé_api_pinecone
PINECONE_ENVIRONMENT=votre_environnement_pinecone
```

4. Lancer le serveur de développement :
```bash
npm run dev
```

5. Accéder à l'application via http://localhost:3000

## Architecture

Le projet est structuré comme suit :

- `/app` : Application Next.js
  - `/api` : Points d'entrée API
  - `/components` : Composants React
  - `/context` : Contextes React pour la gestion d'état
  - `/db` : Configuration de la base de données
  - `/hooks` : Hooks React personnalisés
  - `/lib` : Bibliothèques et utilitaires
  - `/models` : Modèles de données
  - `/public` : Fichiers statiques
  - `/styles` : Styles CSS/Tailwind
  - `/utils` : Fonctions utilitaires

## Modules disponibles

- **Reconnaissance vocale** : Capture et traitement des commandes vocales
- **Gestion de la mémoire** : Stockage et récupération d'informations
- **Interface utilisateur** : Affichage des interactions et configurations
- **Intégration OpenAI** : Traitement du langage naturel

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.
