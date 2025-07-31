# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and source code
COPY package*.json ./
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Build shared types first
RUN cd shared && npm run build

# Build backend
RUN cd backend && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/backend/dist ./
COPY --from=builder --chown=nodejs:nodejs /app/shared/dist ./shared/
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules

USER nodejs

EXPOSE 3001

CMD ["node", "index.js"]