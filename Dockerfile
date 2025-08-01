# Multi-stage Dockerfile for Airport Flight Data Collector

# Stage 1: Base dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Stage 3: Build dependencies (includes dev dependencies)
FROM base AS build-deps
COPY package*.json ./
RUN npm ci

# Stage 4: Build the application
FROM build-deps AS builder
COPY . .
RUN npm run build || true

# Stage 5: API server
FROM base AS api
WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY config ./config
COPY lib ./lib
COPY api ./api
COPY scripts/api-server.js ./scripts/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "scripts/api-server.js"]

# Stage 6: Data collector
FROM base AS collector
WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY config ./config
COPY lib ./lib
COPY src ./src

# Install additional dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set environment variables
ENV NODE_ENV=production

CMD ["node", "src/collect_all.js"]

# Stage 7: Dashboard builder
FROM node:20-alpine AS dashboard-builder
WORKDIR /app/dashboard

# Copy dashboard files
COPY dashboard/package*.json ./
RUN npm ci

COPY dashboard ./
RUN npm run build

# Stage 8: Dashboard runtime
FROM node:20-alpine AS dashboard
WORKDIR /app

# Install serve to run the built dashboard
RUN npm install -g serve

# Copy built dashboard
COPY --from=dashboard-builder /app/dashboard/out ./dashboard

EXPOSE 3000
CMD ["serve", "-s", "dashboard", "-l", "3000"]

# Stage 9: Full stack (default)
FROM base AS fullstack
WORKDIR /app

# Copy everything needed
COPY --from=deps /app/node_modules ./node_modules
COPY --from=dashboard-builder /app/dashboard/.next ./dashboard/.next
COPY --from=dashboard-builder /app/dashboard/public ./dashboard/public
COPY package*.json ./
COPY config ./config
COPY lib ./lib
COPY api ./api
COPY src ./src
COPY scripts ./scripts
COPY dashboard/package*.json ./dashboard/
COPY dashboard/node_modules ./dashboard/node_modules

# Install chromium for collector
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_ENV=production

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'node scripts/api-server.js &' >> /app/start.sh && \
    echo 'cd dashboard && npm start &' >> /app/start.sh && \
    echo 'wait' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000 3001
CMD ["/app/start.sh"]