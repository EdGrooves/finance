#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema ./prisma/schema.prisma

echo "Starting server..."
exec node dist/server.js
