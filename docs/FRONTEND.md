## Frontend Reference

Location: root `/` (Vite project)

### Entry & Config

- `index.html` – Vite HTML entry.
- `src/main.tsx` – React entry; renders `App`.
- `vite.config.ts` – React/Tailwind plugins and dev proxy:
  - Proxies `/api` → `http://localhost:4000`.

### App Shell

- `src/app/App.tsx` – wraps router in:
  - `DndProvider` (react-dnd backend).
  - `AuthProvider` (auth context).
  - `RouterProvider` (React Router 7).

- `src/app/routes.tsx` – route definitions:
  - `/auth` → `AuthLayout` → `Login`.
  - `/` → `RootLayout` → `Dashboard`, `Upload`, `FixedCosts`, `Users`, `Settings`, `NotFound`.

### Auth & API

- `src/app/api/AuthContext.tsx`:
  - Tracks `user` and `loading`.
  - Restores session from token via `/api/auth/me`.

- `src/app/api/client.ts`:
  - `request<T>` wrapper on `fetch` that adds `Authorization` header.
  - Functions: `apiLogin`, `apiRegister`, `apiDemoLogin`, `apiMe`, `apiGetTransactions`, `apiCreateTransaction`, `apiGetFixedCosts`, `apiGetBalances`, etc.

### Key Pages

- `src/app/pages/Login.tsx` – email/password login + demo login.
- `src/app/pages/Dashboard.tsx` – KPIs, charts, shared balances, Add Expense.
- `src/app/pages/Upload.tsx` – CSV import UI.
- `src/app/pages/FixedCosts.tsx` – fixed cost management + summary.
- `src/app/pages/Users.tsx`, `Settings.tsx`, `NotFound.tsx` – UI scaffolds / settings.

### Important Components

- `src/app/components/SplitExpenseModal.tsx` – Add Expense modal:
  - Personal vs Shared toggle.
  - Select participants (other users only).
  - Percentage/Amount split modes.
  - Total validation and submission logic.

- `src/app/components/TransactionDetailsModal.tsx` – read-only view of a transaction and its splits.

### Utilities

- `src/app/utils/format.ts` – `formatCurrency` using `Intl.NumberFormat('de-DE', { currency: 'EUR' })`.
