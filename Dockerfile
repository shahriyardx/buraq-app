# syntax=docker/dockerfile:1

# ─── Base ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS base
WORKDIR /app
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
# Prisma needs a DATABASE_URL to load prisma.config.ts; nothing connects at build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXT_TELEMETRY_DISABLED=1

# ─── Dependencies ────────────────────────────────────────────────────────────
# Only the manifest, lockfile and schema: this layer (and its cache) is reused
# until dependencies or the Prisma schema change — not on every code change.
FROM base AS deps
COPY package.json bun.lock ./
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma.config.ts ./
RUN bun install --frozen-lockfile

# ─── Migration CLI ───────────────────────────────────────────────────────────
# Prisma CLI for `migrate deploy` at startup (standalone output omits it).
# Depends only on `deps`, so it builds in parallel with the app and is cached.
FROM base AS migrator
COPY --from=deps /app/node_modules/prisma/package.json /tmp/prisma.json
RUN mkdir /migrate \
  && cd /migrate \
  && npm init -y >/dev/null \
  && npm install --omit=dev --no-audit --no-fund \
    prisma@$(node -p "require('/tmp/prisma.json').version") dotenv

# ─── Build ───────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ─── Run ─────────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --chown=node:node docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=migrator --chown=node:node /migrate /migrate
COPY --chown=node:node prisma /migrate/prisma
COPY --chown=node:node prisma.config.ts /migrate/prisma.config.ts

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
