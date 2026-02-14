# Utilise l'image officielle Node.js version 20 (LTS)
FROM node:20-alpine

# Définit le répertoire de travail dans le conteneur
WORKDIR /app

# Copie les fichiers package.json et package-lock.json
COPY package*.json ./

# Installe les dépendances de production
RUN npm ci --only=production

# Copie tout le code source dans le conteneur
COPY . .

# Crée le dossier uploads s'il n'existe pas
RUN mkdir -p uploads

# Expose le port 5000 (port du backend)
EXPOSE 5000

# Commande pour démarrer l'application
CMD ["npm", "start"]
