# ---- Base ----
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

# ---- Development ----
FROM base AS development

ENV CI=true
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY packages/database/package.json         ./packages/database/
COPY packages/eslint-config/package.json    ./packages/eslint-config/
COPY packages/mail/package.json             ./packages/mail/
COPY packages/shared/package.json           ./packages/shared/
COPY packages/shared-types/package.json     ./packages/shared-types/
COPY packages/trpc/package.json             ./packages/trpc/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/web/package.json                  ./apps/web/

RUN npm install -g pnpm turbo
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/web ./apps/web

# ---- Dependencies ----
FROM base AS deps

WORKDIR /usr/src/app

# Copy manifests only for optimal layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY packages/database/package.json         ./packages/database/
COPY packages/eslint-config/package.json    ./packages/eslint-config/
COPY packages/mail/package.json             ./packages/mail/
COPY packages/shared/package.json           ./packages/shared/
COPY packages/shared-types/package.json     ./packages/shared-types/
COPY packages/trpc/package.json             ./packages/trpc/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/web/package.json                  ./apps/web/

RUN npm install -g pnpm turbo
RUN pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder

WORKDIR /usr/src/app

RUN npm install -g pnpm turbo

COPY --from=deps /usr/src/app/node_modules         ./node_modules
COPY --from=deps /usr/src/app/packages             ./packages_manifests

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY packages ./packages
COPY apps/web ./apps/web

# Supply build-time env (AUTH_API_URL, etc.) via --build-arg or .env.development
COPY apps/web/.env.development ./apps/web/.env

ENV CI=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN turbo build --filter=web

# ---- Runner ----
FROM base AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Least-privilege: run as non-root
RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 nextjs

# Static assets served directly from the container
COPY --from=builder /usr/src/app/apps/web/public ./apps/web/public

# Standalone bundle (includes only the node_modules actually used)
COPY --from=builder --chown=nextjs:nodejs \
  /usr/src/app/apps/web/.next/standalone ./

# Static Next.js output (JS chunks, CSS, images)
COPY --from=builder --chown=nextjs:nodejs \
  /usr/src/app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 8080

# server.js is produced by Next.js `output: 'standalone'`
CMD ["node", "apps/web/server.js"]
