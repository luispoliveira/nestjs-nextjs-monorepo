# syntax=docker/dockerfile:1.9

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

# ─── Build stage ────────────────────────────────────────────────────────────────
FROM base AS builder

ENV CI=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

# NEXT_PUBLIC_* vars are baked into the client JS bundle during `next build`.
# In Dokploy: add these under "Build Arguments" — NOT "Environment Variables".
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STORAGE_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_STORAGE_URL=${NEXT_PUBLIC_STORAGE_URL}

# AUTH_API_URL and API_URL are read at request time by the route handlers.
# Set these in Dokploy "Environment Variables" (runtime) — no build arg needed.

WORKDIR /usr/src/app

# Corepack picks up the pnpm version from the root package.json "packageManager" field.
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY packages/database/package.json          ./packages/database/
COPY packages/eslint-config/package.json     ./packages/eslint-config/
COPY packages/mail/package.json              ./packages/mail/
COPY packages/shared/package.json            ./packages/shared/
COPY packages/shared-types/package.json      ./packages/shared-types/
COPY packages/trpc/package.json              ./packages/trpc/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/web/package.json                   ./apps/web/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/web ./apps/web

RUN pnpm exec turbo build --filter=web

# ─── Production stage ───────────────────────────────────────────────────────────
FROM base AS production

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

WORKDIR /usr/src/app

# Least-privilege: run as non-root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /usr/src/app/apps/web/public ./apps/web/public

COPY --from=builder --chown=nextjs:nodejs \
  /usr/src/app/apps/web/.next/standalone ./

COPY --from=builder --chown=nextjs:nodejs \
  /usr/src/app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "apps/web/server.js"]
