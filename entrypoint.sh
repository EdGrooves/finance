#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "Running as uid=$PUID gid=$PGID"

# Create group and user if they don't exist
addgroup -g "$PGID" -S appgroup 2>/dev/null || true
adduser -u "$PUID" -S appuser -G appgroup 2>/dev/null || true

# Ensure data dir is owned by the target user
chown -R "$PUID:$PGID" /app/data

echo "Running database migrations..."
su-exec "$PUID:$PGID" npx prisma migrate deploy --schema ./prisma/schema.prisma

echo "Starting server..."
exec su-exec "$PUID:$PGID" node dist/server.js
