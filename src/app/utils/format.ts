const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return euroFormatter.format(amount || 0);
}

function _addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function _addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Returns the next payment date >= today, or null if ended.
 */
export function nextPaymentDate(
  startDateStr: string,
  frequency: string,
  frequencyEvery: number,
  endDateStr?: string | null,
): Date | null {
  const u = frequency.replace(/LY$/, "").replace(/S$/, "");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = endDateStr ? new Date(endDateStr) : null;
  let current = new Date(startDateStr);

  if (u === "WEEK") {
    const intervalDays = frequencyEvery * 7;
    const diffDays = (today.getTime() - current.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays > 0) {
      const skip = Math.floor(diffDays / intervalDays);
      current = _addDays(current, skip * intervalDays);
    }
    while (current < today) current = _addDays(current, intervalDays);
  } else if (u === "MONTH") {
    const diffMonths = (today.getFullYear() - current.getFullYear()) * 12 + (today.getMonth() - current.getMonth());
    if (diffMonths > 0) {
      const skip = Math.floor(diffMonths / frequencyEvery);
      current = _addMonths(current, skip * frequencyEvery);
    }
    while (current < today) current = _addMonths(current, frequencyEvery);
  } else {
    const diffYears = today.getFullYear() - current.getFullYear();
    if (diffYears > 0) {
      const skip = Math.floor(diffYears / frequencyEvery);
      current = _addMonths(current, skip * frequencyEvery * 12);
    }
    while (current < today) current = _addMonths(current, frequencyEvery * 12);
  }

  if (endDate && current > endDate) return null;
  return current;
}

/**
 * Count how many times a recurring payment falls within a calendar month.
 * E.g. every-2-weeks starting 10 Jan → Jan has 2 hits (10th and 24th) = 2 * amount.
 * If no hit in that month, returns 0 (nothing owed that month).
 */
export function countPaymentsInMonth(
  startDateStr: string,
  frequency: string,
  frequencyEvery: number,
  targetYear: number,
  targetMonth: number, // 0-indexed
  endDateStr?: string | null,
): number {
  const u = frequency.replace(/LY$/, "").replace(/S$/, "");
  const startDate = new Date(startDateStr);
  const monthStart = new Date(targetYear, targetMonth, 1);
  const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  const endDate = endDateStr ? new Date(endDateStr) : null;
  const effectiveEnd = endDate && endDate < monthEnd ? endDate : monthEnd;
  let current = new Date(startDate);

  if (u === "WEEK") {
    const intervalDays = frequencyEvery * 7;
    const diffDays = (monthStart.getTime() - current.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays > 0) {
      const skip = Math.max(0, Math.floor(diffDays / intervalDays) - 1);
      current = _addDays(current, skip * intervalDays);
    }
    while (current < monthStart) current = _addDays(current, intervalDays);
    let count = 0;
    while (current <= effectiveEnd) { count++; current = _addDays(current, intervalDays); }
    return count;
  } else if (u === "MONTH") {
    const diffMonths = (targetYear - startDate.getFullYear()) * 12 + (targetMonth - startDate.getMonth());
    if (diffMonths > 0) {
      const skip = Math.max(0, Math.floor(diffMonths / frequencyEvery) - 1);
      current = _addMonths(current, skip * frequencyEvery);
    }
    while (current < monthStart) current = _addMonths(current, frequencyEvery);
    let count = 0;
    while (current <= effectiveEnd) { count++; current = _addMonths(current, frequencyEvery); }
    return count;
  } else { // YEAR
    const diffYears = targetYear - startDate.getFullYear();
    if (diffYears > 0) {
      const skip = Math.max(0, Math.floor(diffYears / frequencyEvery) - 1);
      current = _addMonths(current, skip * frequencyEvery * 12);
    }
    while (current < monthStart) current = _addMonths(current, frequencyEvery * 12);
    let count = 0;
    while (current <= effectiveEnd) { count++; current = _addMonths(current, frequencyEvery * 12); }
    return count;
  }
}
