FROM node:20-alpine

RUN npm install -g pnpm@9 tsx

WORKDIR /app

COPY . .

RUN pnpm install

RUN pnpm --filter @fvos/db exec prisma generate

EXPOSE 3001

CMD pnpm --filter @fvos/db exec prisma migrate deploy && tsx apps/api/src/index.ts
