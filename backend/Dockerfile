# Build context is the WORKSPACE ROOT (not backend/).
# Build with: docker build -f backend/Dockerfile .
# This uses the single root pnpm-lock.yaml so dev and prod resolve identical deps.

# --- Builder Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10.28.1

# Native build toolchain for bcrypt (node-gyp).
RUN apk add --no-cache python3 make g++

# Copy only the manifests needed to resolve the frozen lockfile, for layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

# Install only the backend workspace's dependencies (builds bcrypt here).
RUN pnpm install --frozen-lockfile --filter backend

# Copy the backend source and build.
COPY backend ./backend
RUN pnpm --filter backend build

# Produce a self-contained, production-pruned bundle (native deps already built).
RUN pnpm --filter backend deploy --prod --legacy /app/deploy

# --- Production Stage ---
FROM node:20-alpine AS runner

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy the pruned node_modules + manifest and the compiled output. No install,
# no build toolchain needed in the runtime image.
COPY --from=builder --chown=nodejs:nodejs /app/deploy/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/deploy/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/backend/dist ./dist

RUN mkdir -p /app/logs && chown nodejs:nodejs /app/logs

USER nodejs

EXPOSE 4000

CMD ["node", "dist/index.js"]
