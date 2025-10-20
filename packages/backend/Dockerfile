# Backend Dockerfile (NestJS)
FROM node:18-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for selective install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm
# Build shared first (if needed by backend)
RUN pnpm --filter @hyper-context/shared build
# Generate Prisma client
RUN pnpm --filter @hyper-context/backend db:generate
# Build backend (Nest → dist/)
RUN pnpm --filter @hyper-context/backend build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 appuser

# Copy built backend and runtime deps
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/package.json ./package.json
COPY --from=builder /app/packages/backend/prisma ./prisma
COPY packages/backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Database directory (mounted by compose)
RUN mkdir -p /app/database && chown appuser:nodejs /app/database

USER appuser

EXPOSE 3001
ENV PORT=3001
ENTRYPOINT ["/app/docker-entrypoint.sh"]
