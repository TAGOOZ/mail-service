# Frontend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app

# Copy package files and source code
COPY package*.json ./
COPY shared/ ./shared/
COPY frontend/ ./frontend/
COPY tsconfig.json ./

# Install all dependencies
RUN npm ci

# Build shared types first
RUN cd shared && npm run build

# Build frontend
RUN cd frontend && npm run build

# Production image with nginx
FROM nginx:alpine AS runner

# Copy built application
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]