# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Build server ─────────────────────────────────────────────────────
FROM node:20-alpine AS server-build
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Server runtime deps
COPY --from=server-build /app/node_modules ./node_modules
COPY --from=server-build /app/dist ./dist
COPY --from=server-build /app/prisma ./prisma

# Frontend static files served by Express
COPY --from=frontend-build /app/dist ./public

# Data volume for SQLite
RUN mkdir -p /app/data

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/app/data/finance.db

EXPOSE 4000
VOLUME ["/app/data"]

ENTRYPOINT ["./entrypoint.sh"]
