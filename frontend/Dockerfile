# Build context is the WORKSPACE ROOT (not frontend/).
# Build with: docker build -f frontend/Dockerfile .
# This uses the single root pnpm-lock.yaml so dev and prod resolve identical deps.

# --- Builder Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10.28.1

# Copy only the manifests needed to resolve the frozen lockfile, for layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

# Install only the frontend workspace's dependencies.
RUN pnpm install --frozen-lockfile --filter frontend

# Copy the frontend source and build.
COPY frontend ./frontend

ARG API_URL
ENV API_URL=$API_URL

RUN pnpm --filter frontend build

# --- Production Stage ---
FROM node:20-alpine AS runner

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

RUN npm install -g pnpm@10.28.1

# Reinstall production-only dependencies against the same root lockfile.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN pnpm install --prod --frozen-lockfile --filter frontend

# Copy the build output.
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next ./frontend/.next
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/next.config.mjs ./frontend/next.config.mjs

USER nextjs

EXPOSE 3000

CMD ["pnpm", "--filter", "frontend", "start"]
