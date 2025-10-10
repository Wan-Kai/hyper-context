# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/shared/package.json packages/shared/

# Install pnpm and dependencies
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared package first
RUN corepack enable pnpm
RUN pnpm --filter @hyper-context/shared build

# Generate Prisma client
RUN pnpm --filter @hyper-context/backend db:generate

# Build backend
RUN pnpm --filter @hyper-context/backend build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/backend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/backend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/backend/.next/static ./.next/static
COPY --from=builder /app/packages/backend/prisma ./prisma

# Create database directory
RUN mkdir -p /app/database && chown nextjs:nodejs /app/database

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]