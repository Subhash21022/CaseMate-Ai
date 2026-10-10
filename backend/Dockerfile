# ==============================================================================
# CaseMate AI — Backend Production Dockerfile
# Multi-stage build for optimal image size and security
# ==============================================================================

# Stage 1: Build TypeScript source code
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory and assign permissions to non-root node user
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
