# ---------- deps (install all deps for building) ----------
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build Nest
RUN npm run build

# ⬇⬇⬇ KLJUČNI DEO ⬇⬇⬇
# ručno ubacujemo production data-source i migracije u dist
COPY data-source.prod.js /app/dist/data-source.prod.js
COPY src/migrations /app/dist/migrations

# ---------- prod deps (only production deps) ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

USER node

COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
