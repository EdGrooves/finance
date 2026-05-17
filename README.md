# Personal Finance Dashboard

This repo contains a React/Vite frontend (in `src/`) and a simple Node/TypeScript/Express + Prisma backend (in `server/`).

## Prerequisites

- Node 18+
- pnpm (recommended)

## Setup

1. Install dependencies for the whole workspace:

```bash
pnpm install
```

2. Configure the backend environment (from the `server` directory):

Create a `.env` file in `server/`:

```bash
cd server
cp .env.example .env   # or create it manually
```

Minimal `.env` contents:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-prod"
CORS_ORIGIN="http://localhost:5173"
PORT=4000
```

3. Run database migrations and generate the Prisma client (still in `server/`):

```bash
pnpm prisma:migrate
pnpm prisma:generate
```

This will create a local SQLite database at `server/dev.db`.

## Running the app in development

In one terminal, start the backend:

```bash
cd server
pnpm dev
```

The API will be available at `http://localhost:4000/api`.

In another terminal, start the frontend from the repo root:

```bash
pnpm dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend.

## Tests

Basic backend logic tests (for shared-balance computation) can be run from `server/`:

```bash
cd server
pnpm test
```
