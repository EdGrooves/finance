import type { ExpenseSplit } from "@prisma/client";

export interface SplitInput {
  userId: string;
  amount?: number;
  percentage?: number;
}

export function validateAndNormalizeSplits(totalAmount: number, splits: SplitInput[]): SplitInput[] {
  if (splits.length === 0) {
    throw new Error("Shared transactions require at least one split");
  }

  const hasAmount = splits.some((s) => s.amount != null);
  const hasPercentage = splits.some((s) => s.percentage != null);

  if (hasAmount && hasPercentage) {
    throw new Error("Use either amount or percentage splits, not both");
  }

  const TOLERANCE = 0.01;

  if (hasAmount) {
    const sum = splits.reduce((acc, s) => acc + (s.amount ?? 0), 0);
    if (Math.abs(sum - totalAmount) > TOLERANCE) {
      throw new Error("Split amounts must sum to total amount");
    }
    return splits.map((s) => ({
      ...s,
      percentage: totalAmount > 0 ? (100 * (s.amount ?? 0)) / totalAmount : 0,
    }));
  }

  // Percentage mode
  const sumPct = splits.reduce((acc, s) => acc + (s.percentage ?? 0), 0);
  if (Math.abs(sumPct - 100) > TOLERANCE) {
    throw new Error("Split percentages must sum to 100");
  }

  // Compute amounts with rounding fix on last participant
  const normalized: SplitInput[] = [];
  let accumulated = 0;
  splits.forEach((s, idx) => {
    if (idx === splits.length - 1) {
      const amount = Number((totalAmount - accumulated).toFixed(2));
      normalized.push({ ...s, amount });
    } else {
      const amount = Number(((totalAmount * (s.percentage ?? 0)) / 100).toFixed(2));
      accumulated += amount;
      normalized.push({ ...s, amount });
    }
  });

  return normalized;
}
