FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9 tsx

WORKDIR /app

COPY . .

RUN pnpm install

RUN pnpm --filter @fvos/core build
RUN pnpm --filter @fvos/cost-engine build
RUN pnpm --filter @fvos/ai-router build
RUN pnpm --filter @fvos/db exec prisma generate

EXPOSE 3001

CMD pnpm --filter @fvos/db exec prisma db push --accept-data-loss && tsx apps/api/src/index.ts
