# Proxy IA mangetout — image de production.
# La clé OpenRouter est injectée en variable d'env au runtime (jamais dans l'image).
# Milestone 0 : serveur de santé zéro-dépendance lancé en strip-types.
# Milestone 8 : ajoutera deps + build TS (dist/) + npm ci.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
EXPOSE 8787
CMD ["node", "--experimental-strip-types", "src/index.ts"]
