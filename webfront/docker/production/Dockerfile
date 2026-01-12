# syntax=docker.io/docker/dockerfile:1

############################################
# BASE IMAGE
############################################
FROM node:20-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Add internal CA if you need it
COPY NBSCA.crt /usr/local/share/ca-certificates/NBSCA.crt
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/NBSCA.crt

############################################
# BUILDER STAGE
############################################
FROM base AS builder
WORKDIR /app

# Install extra system libs to build lightningcss + turbopack deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    clang \
    libc6-dev \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (native binaries get compiled HERE)
RUN npm ci

# Copy app source
COPY . .

# Build (Turbopack)
ENV NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1
RUN npm run build

############################################
# RUNNER STAGE
############################################
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy built app
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
