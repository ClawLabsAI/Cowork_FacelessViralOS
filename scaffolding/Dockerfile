FROM node:20-alpine

RUN npm install -g pnpm@9

WORKDIR /app

COPY . .

RUN pnpm install

EXPOSE 3001

CMD ["pnpm", "--filter", "@fvos/api", "exec", "tsx", "src/index.ts"]
