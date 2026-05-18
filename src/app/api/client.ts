import type { Transaction, User, Balance, ExpenseSplit } from "../types";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("auth_token");
}

function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("auth_token", token);
  else window.localStorage.removeItem("auth_token");
}

export { setToken };

async function request<T>(
  path: string,
  options: RequestInit = {},
  opts: { auth?: boolean } = { auth: true },
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (opts.auth !== false) {
    const token = getToken();
    if (token) {
      (headers as any)["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// Auth
export interface AuthResponse {
  token: string;
  user: Pick<User, "id" | "name" | "email" | "color">;
}

export async function apiLogin(email: string, password: string) {
  const data = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, { auth: false });
  setToken(data.token);
  return data.user;
}

export async function apiRegister(name: string, email: string, password: string) {
  const data = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  }, { auth: false });
  setToken(data.token);
  return data.user;
}

export async function apiSelectUser(userId: string) {
  const data = await request<AuthResponse>("/auth/select", {
    method: "POST",
    body: JSON.stringify({ userId }),
  }, { auth: false });
  setToken(data.token);
  return data.user;
}

export async function apiDemoLogin() {
  const data = await request<AuthResponse>("/auth/demo", { method: "POST" }, { auth: false });
  setToken(data.token);
  return data.user;
}

export async function apiMe() {
  return request<{ user: User; settings: any }>("/auth/me", { method: "GET" });
}

export function apiLogout() {
  setToken(null);
}

// Users
export async function apiGetUsers() {
  return request<User[]>("/users", { method: "GET" }, { auth: false });
}

// Transactions
export interface TransactionInput {
  description: string;
  amount: number;
  category: string;
  date: string;
  paidBy?: string;
  isShared?: boolean;
  splits?: ExpenseSplit[];
}

export async function apiGetTransactions(params: Record<string, string | number | boolean> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });
  const qs = query.toString();
  const path = qs ? `/transactions?${qs}` : "/transactions";
  return request<Transaction[]>(path, { method: "GET" });
}

export async function apiCreateTransaction(input: TransactionInput) {
  return request<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiUpdateTransaction(id: string, input: Partial<TransactionInput>) {
  return request<Transaction>(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function apiDeleteTransaction(id: string) {
  return request<void>(`/transactions/${id}`, { method: "DELETE" });
}

export interface CsvRow {
  Date: string;
  Description: string;
  Category: string;
  Amount: number;
  isShared?: boolean;
}

export async function apiImportTransactions(rows: CsvRow[]) {
  return request<{ imported: number; failed: number; errors: { index: number; error: string }[] }>(
    "/transactions/import",
    {
      method: "POST",
      body: JSON.stringify({ rows }),
    },
  );
}

// Fixed costs
export interface FixedCostDTO {
  id: string;
  ownerId: string;
  name: string;
  amount: number;
  category: string;
  frequency: string;
  frequencyEvery: number;
  startDate: string;
  nextDueDate: string;
  isShared: boolean;
  defaultSplits?: unknown;
  endDate?: string | null;
  hasHistory?: boolean;
}

export interface FixedCostHistoryEntry {
  id: string;
  amount: number;
  frequency: string;
  frequencyEvery: number;
  startDate: string;
  archivedAt: string;
}

export async function apiGetFixedCostHistory(id: string) {
  return request<FixedCostHistoryEntry[]>(`/fixed-costs/${id}/history`, { method: "GET" });
}

export async function apiGetFixedCosts(asOf?: string) {
  const path = asOf ? `/fixed-costs?asOf=${encodeURIComponent(asOf)}` : "/fixed-costs";
  return request<FixedCostDTO[]>(path, { method: "GET" });
}

export async function apiCreateFixedCost(input: Omit<FixedCostDTO, "id" | "ownerId">) {
  return request<FixedCostDTO>("/fixed-costs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiUpdateFixedCost(id: string, input: Partial<Omit<FixedCostDTO, "id">> & { effectiveDate?: string }) {
  return request<FixedCostDTO>(`/fixed-costs/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function apiDeleteFixedCost(id: string, deleteHistory = false) {
  const path = deleteHistory ? `/fixed-costs/${id}?deleteHistory=true` : `/fixed-costs/${id}`;
  return request<void>(path, { method: "DELETE" });
}

// Settings
export async function apiGetSettings() {
  return request<any>("/settings", { method: "GET" });
}

export async function apiGetUsedCategories() {
  return request<{ transaction: string[]; fixedCost: string[] }>("/settings/categories-in-use", { method: "GET" });
}

export async function apiUpdateSettings(input: any) {
  return request<any>("/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// Balances & settlements
export async function apiGetBalances() {
  return request<Balance[]>("/balances", { method: "GET" });
}

export async function apiCreateSettlement(payeeId: string, amount: number, date?: string, description?: string) {
  return request("/settlements", {
    method: "POST",
    body: JSON.stringify({ payeeId, amount, date, description }),
  });
}
