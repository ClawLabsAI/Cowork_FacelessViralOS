# ============================================================
# Faceless Viral OS — API (Railway / Docker)
# ============================================================
# Strategy:
#   - tsx runs TypeScript directly at runtime (no tsc needed for most packages)
#   - Only @fvos/core needs a real tsc build (its main points to ./dist)
#   - @fvos/db, @fvos/cost-engine, @fvos/ai-router all use ./src/index.ts as main
#   - prisma generate must run during build so the client is baked into the image
# ============================================================

FROM node:20-slim

# System deps (openssl required by Prisma)
RUN apt-get update -y \
  && apt-get install -y openssl curl \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm and tsx globally
RUN npm install -g pnpm@9 tsx

WORKDIR /app

# Copy entire monorepo
COPY . .

# Install ALL workspace dependencies
RUN pnpm install

# Build @fvos/core (the only package that exports from ./dist)
RUN pnpm --filter @fvos/core build

# Generate Prisma client (baked into the image, no network needed at runtime)
RUN pnpm --filter @fvos/db exec prisma generate

EXPOSE 3001

# At startup:
#   1. Push schema to DB (safe, idempotent)
#   2. Start API with tsx (handles TypeScript natively)
CMD pnpm --filter @fvos/db exec prisma db push --accept-data-loss \
  && tsx apps/api/src/index.ts
