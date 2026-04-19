FROM node:20-alpine

RUN npm install -g pnpm@9 tsx

WORKDIR /app

COPY . .

RUN pnpm install

EXPOSE 3001

CMD ["tsx", "apps/api/src/index.ts"]
