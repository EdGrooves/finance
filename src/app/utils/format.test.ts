import { describe, it, expect } from "vitest";
import { formatCurrency, countPaymentsInMonth } from "./format";

// ── formatCurrency ────────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats a number as euros", () => {
    const result = formatCurrency(100);
    expect(result).toContain("100");
    expect(result).toContain("€");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toContain("0");
  });

  it("handles falsy (undefined/NaN coerced)", () => {
    expect(formatCurrency(0)).toContain("0");
  });
});

// ── countPaymentsInMonth ──────────────────────────────────────────────────────

describe("countPaymentsInMonth", () => {
  // Monthly
  it("monthly: 1 hit in start month", () => {
    expect(countPaymentsInMonth("2026-01-15", "MONTH", 1, 2026, 0)).toBe(1);
  });

  it("monthly: 1 hit later month", () => {
    expect(countPaymentsInMonth("2026-01-15", "MONTH", 1, 2026, 4)).toBe(1);
  });

  it("monthly: 0 before start month", () => {
    expect(countPaymentsInMonth("2026-03-01", "MONTH", 1, 2026, 1)).toBe(0);
  });

  it("every-2-months: hits on even offset months", () => {
    // start Jan, every 2 months → Jan, Mar, May...
    expect(countPaymentsInMonth("2026-01-01", "MONTH", 2, 2026, 2)).toBe(1); // Mar
    expect(countPaymentsInMonth("2026-01-01", "MONTH", 2, 2026, 3)).toBe(0); // Apr
  });

  // Weekly
  it("weekly: counts correct hits in January", () => {
    // start 2026-01-01, every week → hits: 1,8,15,22,29 = 5 times
    expect(countPaymentsInMonth("2026-01-01", "WEEK", 1, 2026, 0)).toBe(5);
  });

  it("every-2-weeks: hits", () => {
    // start 2026-01-01, every 2 weeks → 1, 15, 29 = 3 in Jan
    expect(countPaymentsInMonth("2026-01-01", "WEEK", 2, 2026, 0)).toBe(3);
  });

  it("weekly: 0 before start", () => {
    expect(countPaymentsInMonth("2026-06-01", "WEEK", 1, 2026, 4)).toBe(0); // May
  });

  // Yearly
  it("yearly: 1 hit in start year+month", () => {
    expect(countPaymentsInMonth("2025-03-15", "YEAR", 1, 2026, 2)).toBe(1); // Mar 2026
  });

  it("yearly: 0 in non-anniversary month", () => {
    expect(countPaymentsInMonth("2025-03-15", "YEAR", 1, 2026, 3)).toBe(0); // Apr 2026
  });

  it("every-2-years: hits on even years only", () => {
    expect(countPaymentsInMonth("2024-06-01", "YEAR", 2, 2026, 5)).toBe(1); // Jun 2026
    expect(countPaymentsInMonth("2024-06-01", "YEAR", 2, 2025, 5)).toBe(0); // Jun 2025
  });

  // End date
  it("respects endDate: 0 if ended before month", () => {
    expect(countPaymentsInMonth("2026-01-01", "MONTH", 1, 2026, 4, "2026-03-31")).toBe(0);
  });

  it("respects endDate: hit if end is within month", () => {
    // start Jan, monthly, ends May 20 → still 1 hit on May 1
    expect(countPaymentsInMonth("2026-01-01", "MONTH", 1, 2026, 4, "2026-05-20")).toBe(1);
  });

  it("null endDate treated as no end", () => {
    expect(countPaymentsInMonth("2026-01-01", "MONTH", 1, 2026, 11, null)).toBe(1);
  });
});
