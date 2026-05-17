## Backend Reference

Location: `server/`

### Tech Stack

- Node.js + TypeScript
- Express.js
- Prisma ORM + SQLite

### Key Files

- `package.json` – scripts (`dev`, `build`, `start`, `prisma:migrate`).
- `tsconfig.json` – TypeScript config.
- `prisma/schema.prisma` – database schema.
- `src/server.ts` – Express app setup, routes, and server startup.
- `src/lib/auth.ts` – JWT helpers (`signToken`, `verifyToken`).
- `src/lib/balances.ts` – shared-balance calculation.
- `src/lib/splits.ts` – split validation and normalization.

### Environment

`.env` (from `.env.example`):

- `DATABASE_URL="file:./dev.db"`
- `JWT_SECRET="change-me-in-dev"`
- `CORS_ORIGIN="http://localhost:5173"`
- `PORT=4000`

### Main Endpoints (all under `/api`)

- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/demo`
  - `GET /auth/me`

- Users:
  - `GET /users`
  - `GET /users/:id`

- Transactions:
  - `GET /transactions`
  - `POST /transactions`
  - `PUT /transactions/:id`
  - `DELETE /transactions/:id`
  - `POST /transactions/import`

- Fixed costs:
  - `GET /fixed-costs`
  - `POST /fixed-costs`
  - `PUT /fixed-costs/:id`
  - `DELETE /fixed-costs/:id`

- Settings:
  - `GET /settings`
  - `PUT /settings`

- Balances & settlements:
  - `GET /balances`
  - `POST /settlements`

- Health:
  - `GET /health`

For full details, inspect `src/server.ts` and `prisma/schema.prisma`.
