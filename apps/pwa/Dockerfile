# syntax=docker/dockerfile:1
# Static Angular build served by unprivileged nginx (low memory)
FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/pwa/package.json ./apps/pwa/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN pnpm install --frozen-lockfile --filter @avluo/pwa...

COPY apps/pwa ./apps/pwa
COPY packages/shared-types ./packages/shared-types

WORKDIR /app/apps/pwa
RUN pnpm build --configuration=production \
  && find dist -name '*.map' -delete

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

# Low-footprint main config (worker_processes 1)
COPY apps/pwa/nginx.main.conf /etc/nginx/nginx.conf
COPY apps/pwa/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/pwa/dist/pwa/browser /usr/share/nginx/html

USER 101
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
