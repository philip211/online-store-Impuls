# syntax=docker/dockerfile:1
# Production image: multi-stage, dev dependencies stay in the build stage, runs as non-root.

FROM node:24-alpine AS build
WORKDIR /app
# prisma generate reads the config but never connects: a placeholder URL is enough.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts ./
# Photos uploaded in the admin panel; mount a volume here so they survive redeploys.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
# Migrations are applied before the new version starts serving traffic.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
