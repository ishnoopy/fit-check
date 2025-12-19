# --- Builder Stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm directly
RUN npm install -g pnpm@9.15.0

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY . .
RUN pnpm build

# --- Production Stage ---
FROM node:20-alpine AS runner

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

# Install pnpm directly
RUN npm install -g pnpm@9.15.0

# Copy package files and install production dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --prod --frozen-lockfile

# Copy build output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

CMD ["pnpm", "start"]
