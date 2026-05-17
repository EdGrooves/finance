# Personal Finance Dashboard – Project Overview

This document summarizes what the application does, how it is structured, and how to run it. It is intended as a durable reference so you can come back later or onboard someone else.

---

## 1. Purpose & Concept

This is a **personal finance web app** for:

- Importing bank transactions via **CSV**.
- Visualizing **spending analytics** (totals, trends, categories).
- Tracking **fixed vs variable** costs.
- Handling **multi-user shared expenses** between a small set of users (primarily you and a friend), with:
  - Flexible splits (percentages or explicit amounts).
  - “Who owes who” balances.

The UI layout and design system come from a Figma export (React + Vite + Tailwind/shadcn+Radix). The code generated from Figma is treated as the visual baseline; we wired real logic and an API behind it with minimal structural changes.

---

## 2. High-Level Architecture

Monorepo root: this directory.

### Frontend

- **Stack:** React 18 + Vite + React Router 7.
- **Location:** `./src/app` (and `./src/main.tsx` as entry).
- **Styling:** Tailwind CSS, shadcn-style UI, Radix primitives.
- **State:**
  - Auth handled via a React context (`AuthContext`).
  - Data fetched from the backend via a simple API client module.

### Backend

- **Stack:** Node.js + TypeScript + Express + Prisma + SQLite.
- **Location:** `./server`.
- **Database:** SQLite file (`dev.db`) managed by Prisma migrations.
- **Auth:** Simple JWT-based auth with demo and email/password login.
- **API prefix:** All endpoints served under `/api/...`.

### Dev integration

- Vite dev server runs at `http://localhost:5173`.
- Backend runs at `http://localhost:4000`.
- Vite proxies `/api` to the backend (configured in `vite.config.ts`).

---

## 3. Domain & Data Model (Backend)

Prisma models (simplified):

- **User**
  - `id: string` (cuid)
  - `email: string` (unique)
  - `name: string`
  - `passwordHash: string`
  - `color: string` (used for avatar/identification in UI)

- **Transaction**
  - `id: string`
  - `description: string`
  - `amount: Decimal` (money value)
  - `category: string`
  - `date: DateTime` (ISO)
  - `paidById: string` (FK → User)
  - `isShared: boolean`
  - `isFixed: boolean` (optional flag)
  - `origin: string` with allowed values by convention:
    - `"CSV_IMPORT" | "MANUAL_ENTRY" | "SYSTEM_SETTLEMENT"`
  - Relations: `splits: ExpenseSplit[]`

- **ExpenseSplit** (for shared expenses)
  - `id: string`
  - `transactionId: string` (FK → Transaction)
  - `userId: string` (FK → User)
  - `amount: Decimal?`
  - `percentage: number?`
  - Rules per transaction:
    - Either **all amount-based** or **all percentage-based** splits.
    - Sum of percentages ≈ 100%, or sum of amounts ≈ total transaction amount (tolerance for rounding).

- **FixedCost**
  - `id: string`
  - `userId: string` (owner)
  - `name, amount, category`
  - `frequency: string` (e.g. `"MONTHLY"`)
  - `nextDueDate: DateTime`
  - `isShared: boolean`
  - `defaultSplits: string?` (JSON-stringified defaults, parsed in app code)

- **UserSettings**
  - `userId: string`
  - `currency: string` (conceptually `"EUR"` for this app)
  - `dateFormat: string`
  - `defaultMonthRange: number`
  - `defaultCategories: string?` (JSON-stringified)
  - `defaultSplitPercentage: number`

- **Settlement**
  - `id: string`
  - `payerId: string`, `payeeId: string`
  - `amount: Decimal`
  - `date: DateTime`
  - `description?: string`
  - `transactionId?: string` (optional link to a settlement transaction)

For more backend details, see `./docs/BACKEND.md`.

---

## 4. Frontend Features

### Authentication

- Login/Sign-up page (`Login.tsx`) with:
  - Email/password registration and login.
  - "Continue as demo user" (no password).
- `AuthContext` manages current user and token:
  - Token stored in `localStorage`.
  - On load, calls `/api/auth/me` to restore session.
- `RootLayout` protects app routes:
  - If not authenticated, redirects to `/auth`.

### Dashboard

- File: `src/app/pages/Dashboard.tsx`.
- Fetches:
  - Transactions (`GET /api/transactions`).
  - Fixed costs (`GET /api/fixed-costs`).
  - Users (`GET /api/users`).
  - Shared balances (`GET /api/balances`).
- Shows:
  - KPI cards for:
    - Total Spending (what current user paid).
    - Fixed Costs (sum of fixed costs).
    - Variable Costs (total – fixed).
    - Shared Expenses (shared transactions paid by current user).
  - Monthly spending trend (line chart across recent months).
  - Category breakdown for the current month (pie chart).
  - Shared balances card (who owes you or you owe, per other user).
  - "Add Expense" button that opens the Add Expense modal.

### CSV Upload (Transactions Import)

- File: `src/app/pages/Upload.tsx`.
- Drag & drop or click to select a **single** `.csv` file (max 5 MB).
- Expected header: `Date,Description,Category,Amount`.
- Parses client side; validates rows; calls `POST /api/transactions/import` with valid rows.
- Shows per-file status (uploading/success/error) and row import counts.

### Fixed Costs

- File: `src/app/pages/FixedCosts.tsx`.
- Uses `/api/fixed-costs` for CRUD.
- Renders a table of fixed costs with name, category, due day, and amount.
- Shows a total/monthly summary, used also in Dashboard KPIs.

### Add Expense (Shared or Personal)

- Component: `src/app/components/SplitExpenseModal.tsx`.
- Triggered by "Add Expense" button in Dashboard.
- Features:
  - **Basic info:** description, amount, category, payer.
  - **Expense type toggle:** Personal vs Shared (`isSharedExpense`).
  - **Split with:**
    - Shows **only other users**, not the current user.
    - Participant selection list is hidden/ignored when Personal is selected.
  - **Split mode:** Percentage or Amount.
  - **Totals & validation:**
    - Totals are computed only for selected participants.
    - Total box appears **only** if:
      - Expense is Shared, and
      - At least one participant is selected.
    - Validity rules:
      - Percentage mode → sums to 100%.
      - Amount mode → sums to the main amount.

- Submit behavior:
  - **Personal:**
    - Sends `isShared: false` with no splits.
  - **Shared:**
    - Sends `isShared: true` with splits per selected participant.
  - On success, notifies Dashboard via `onCreated` so KPIs/lists update.

### Shared Balances

- Backend computes balances from shared transactions and settlements.
- Dashboard shows a summary per other user:
  - Amount formatted as EUR.
  - Whether they owe you or you owe them.

---

## 5. Currency & Localization

- Currency is **EUR only**.
- Display format uses **German locale** (`de-DE`):
  - Example: `1234.56` → `1.234,56 €`.
- Helper: `src/app/utils/format.ts`:

  ```ts
  const euroFormatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });

  export function formatCurrency(amount: number): string {
    return euroFormatter.format(amount || 0);
  }
  ```

- All UI money displays (Dashboard, Fixed Costs, modals, balances) use `formatCurrency`.
- Inputs (amount fields) remain plain numbers; currency formatting is applied only when displaying values.

---

## 6. Running the App

### Backend (API)

From project root:

```bash
cd server
cp .env.example .env         # one-time setup
npm install                  # or pnpm install
npm run prisma:migrate       # creates/migrates dev.db
npm run dev                  # starts API at http://localhost:4000
```

Health check:

```bash
curl http://localhost:4000/api/health
# {"status":"ok"}
```

### Frontend

From project root:

```bash
npm install                  # or pnpm install
npm run dev                  # starts Vite at http://localhost:5173
```

Open `http://localhost:5173` in a browser.

- Log in via email/password, or use "Continue as demo user".
- Navigate using the sidebar to Dashboard, Upload, Fixed Costs, Settings, etc.

---

## 7. Future Work / TODOs

Potential follow-ups (not yet implemented or only partially done):

- Dedicated transactions list with filtering/search (beyond the dashboard summaries).
- A detailed Shared Balances/Settlements screen.
- Full binding of user settings (date format, default month range) to `/api/settings`.
- Representing settlements as explicit transactions in the UI.
- Dockerfile and CI to build and push a container image to GitHub Container Registry.
