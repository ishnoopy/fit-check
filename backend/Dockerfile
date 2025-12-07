# Builder stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Enable pnpm and pin version
RUN corepack enable && \
    corepack prepare pnpm@9.15.0 --activate

# Install dependencies for native modules (bcrypt needs these)
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile && \
    pnpm store prune

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Enable pnpm and pin version
RUN corepack enable && \
    corepack prepare pnpm@9.15.0 --activate

# Copy package files and install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Use non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Start the application
CMD ["node", "dist/index.js"]
