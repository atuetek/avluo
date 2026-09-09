# syntax=docker/dockerfile:1
# Build context: monorepo root — slim production image via pnpm deploy
FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile --filter @avluo/api...

COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types

WORKDIR /app/apps/api
RUN pnpm exec prisma generate \
  && pnpm build \
  && rm -rf dist/**/*.map dist/**/*.tsbuildinfo

# Self-contained prod tree (no pnpm store / no symlink farm)
WORKDIR /app
RUN pnpm --filter @avluo/api deploy --prod /deploy \
  && cp -R apps/api/dist /deploy/dist \
  && cp -R apps/api/prisma /deploy/prisma \
  && cd /deploy && ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma \
  && rm -rf /deploy/node_modules/@types \
           /deploy/node_modules/typescript \
           /deploy/node_modules/.cache \
           /tmp/* \
           /root/.local /root/.cache

# --- runtime ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat \
  && addgroup -g 1001 -S avluo \
  && adduser -S -u 1001 -G avluo avluo

WORKDIR /app
COPY --from=builder --chown=avluo:avluo /deploy ./

USER avluo
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS=--max-old-space-size=192

EXPOSE 3000
CMD ["node", "dist/main.js"]
