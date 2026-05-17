import { useState, useEffect } from "react";
import { apiGetSettings } from "../api/client";

export const DEFAULT_TRANSACTION_CATEGORIES = [
  "Groceries",
  "Dining Out",
  "Utilities",
  "Entertainment",
  "Transportation",
  "Shopping",
  "Other",
];

export const DEFAULT_FIXED_COST_CATEGORIES = [
  "Housing",
  "Utilities",
  "Entertainment",
  "Insurance",
  "Subscriptions",
  "Other",
];

interface CategoriesSettings {
  transaction: string[];
  fixedCost: string[];
  csvMappings?: Record<string, string>;
}

function parseCategories(raw: string | null | undefined): CategoriesSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        transaction: Array.isArray(parsed.transaction) ? parsed.transaction : DEFAULT_TRANSACTION_CATEGORIES,
        fixedCost: Array.isArray(parsed.fixedCost) ? parsed.fixedCost : DEFAULT_FIXED_COST_CATEGORIES,
        csvMappings: parsed.csvMappings && typeof parsed.csvMappings === "object" ? parsed.csvMappings : {},
      };
    }
  } catch { /* ignore */ }
  return null;
}

export function useCategories() {
  const [transactionCategories, setTransactionCategories] = useState<string[]>(DEFAULT_TRANSACTION_CATEGORIES);
  const [fixedCostCategories, setFixedCostCategories] = useState<string[]>(DEFAULT_FIXED_COST_CATEGORIES);
  const [csvMappings, setCsvMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    void apiGetSettings().then((settings) => {
      const parsed = parseCategories((settings as any)?.defaultCategories);
      if (parsed) {
        setTransactionCategories(parsed.transaction);
        setFixedCostCategories(parsed.fixedCost);
        setCsvMappings(parsed.csvMappings ?? {});
      }
    }).catch(() => {});
  }, []);

  return { transactionCategories, fixedCostCategories, csvMappings };
}
