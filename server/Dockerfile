# Proxy IA mangetout — image de production.
# La clé OpenRouter est injectée en variable d'env au runtime (jamais dans l'image).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
EXPOSE 8787
# Exécution TypeScript directe via tsx (pas d'étape de build séparée).
CMD ["npx", "tsx", "src/index.ts"]
