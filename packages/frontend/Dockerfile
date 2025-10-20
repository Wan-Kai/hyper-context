# Frontend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/frontend/package.json packages/frontend/
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

# Build frontend
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN echo "Building frontend with VITE_API_BASE_URL=$VITE_API_BASE_URL" \
 && pnpm --filter @hyper-context/frontend build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 frontend

# Install serve to serve static files
RUN npm install -g serve

COPY --from=builder --chown=frontend:nodejs /app/packages/frontend/dist ./dist

USER frontend

EXPOSE 3000

ENV PORT 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
