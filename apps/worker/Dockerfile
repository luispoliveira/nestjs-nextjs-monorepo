FROM node:22-alpine AS development

ENV CI=true
ENV NODE_ENV=development

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY turbo.json ./

COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/mail/package.json ./packages/mail/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/trpc/package.json ./packages/trpc/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/worker/package.json ./apps/worker/

RUN npm install -g pnpm
RUN npm install -g turbo
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/worker ./apps/worker

RUN turbo db:generate

RUN turbo build --filter=worker

FROM node:22-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
COPY turbo.json ./

RUN npm install -g pnpm
RUN npm install -g turbo
RUN pnpm install --frozen-lockfile --prod

COPY --from=development /usr/src/app/apps/worker/dist ./dist

CMD ["node", "dist/index.js"]
