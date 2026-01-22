# ---------- deps (install all deps for building) ----------
FROM node:20-alpine AS deps
WORKDIR /app

# (opciono) ako imaš native module na alpine-u, nekad treba ovo:
# RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm ci

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- prod deps (only production deps) ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# koristi built-in "node" user (non-root)
USER node

COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/package.json ./package.json

# Nest obično sluša na 3000
EXPOSE 3000

CMD ["node", "dist/src/main.js"]