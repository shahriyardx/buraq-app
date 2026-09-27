# syntax=docker/dockerfile:1

# ─── Build ───────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

# Prisma needs a DATABASE_URL to load prisma.config.ts; nothing connects at build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json bun.lock* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN bun install

COPY . .
RUN bun run build

# Prisma CLI for `migrate deploy` at startup (standalone output omits it).
RUN mkdir /migrate \
  && cd /migrate \
  && npm init -y >/dev/null \
  && npm install --omit=dev prisma@$(node -p "require('/app/node_modules/prisma/package.json').version") dotenv

# ─── Run ─────────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

COPY --from=builder --chown=node:node /migrate /migrate
COPY --from=builder --chown=node:node /app/prisma /migrate/prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts /migrate/prisma.config.ts

COPY --chown=node:node docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
