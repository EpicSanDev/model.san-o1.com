# Étape de construction
FROM node:18-alpine AS builder

# Installer les dépendances système nécessaires pour Prisma
RUN apk add --no-cache openssl

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm ci

# Copier les sources de l'application
COPY . .

# Générer le fichier prisma client
RUN npx prisma generate

# Construire l'application
RUN npm run build

# Étape de production
FROM node:18-alpine AS runner

# Définir les variables d'environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Créer un utilisateur non-root pour exécuter l'application
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers nécessaires
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Installer uniquement les dépendances de production si vous utilisez npm ci à l'étape de construction
# Sinon, les dépendances sont déjà optimisées

# Exposer le port
EXPOSE 3000

# Définir l'utilisateur
USER nextjs

# Point d'entrée de l'application
CMD ["npm", "start"]

# Définir les métadonnées
LABEL maintainer="Maintainer <maintainer@example.com>"
LABEL version="1.0.0"
LABEL description="Assistant Vocal IA avec mémoire à long terme"

# Vérification de la santé
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1 