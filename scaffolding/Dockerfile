FROM node:20-slim

RUN npm install -g pnpm@9 tsx

WORKDIR /app

COPY . .

RUN pnpm install

RUN pnpm --filter @fvos/db exec prisma generate

EXPOSE 3001

CMD pnpm --filter @fvos/db exec prisma db push --accept-data-loss && tsx apps/api/src/index.ts
