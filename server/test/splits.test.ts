import { describe, it, expect } from "vitest";
import { validateAndNormalizeSplits } from "../src/lib/splits";

describe("validateAndNormalizeSplits", () => {
  it("throws on empty splits", () => {
    expect(() => validateAndNormalizeSplits(100, [])).toThrow("at least one split");
  });

  it("throws on mixed amount + percentage", () => {
    expect(() => validateAndNormalizeSplits(100, [
      { userId: "u1", amount: 50 },
      { userId: "u2", percentage: 50 },
    ])).toThrow("not both");
  });

  it("amount mode: throws when sum != total", () => {
    expect(() => validateAndNormalizeSplits(100, [
      { userId: "u1", amount: 40 },
      { userId: "u2", amount: 40 },
    ])).toThrow("sum to total");
  });

  it("amount mode: valid — adds percentage fields", () => {
    const result = validateAndNormalizeSplits(100, [
      { userId: "u1", amount: 60 },
      { userId: "u2", amount: 40 },
    ]);
    expect(result[0]).toMatchObject({ userId: "u1", amount: 60, percentage: 60 });
    expect(result[1]).toMatchObject({ userId: "u2", amount: 40, percentage: 40 });
  });

  it("amount mode: zero total sets percentage 0", () => {
    const result = validateAndNormalizeSplits(0, [
      { userId: "u1", amount: 0 },
    ]);
    expect(result[0].percentage).toBe(0);
  });

  it("percentage mode: throws when sum != 100", () => {
    expect(() => validateAndNormalizeSplits(100, [
      { userId: "u1", percentage: 40 },
      { userId: "u2", percentage: 40 },
    ])).toThrow("sum to 100");
  });

  it("percentage mode: computes amounts", () => {
    const result = validateAndNormalizeSplits(100, [
      { userId: "u1", percentage: 70 },
      { userId: "u2", percentage: 30 },
    ]);
    expect(result[0].amount).toBe(70);
    expect(result[1].amount).toBe(30);
  });

  it("percentage mode: rounding fix on last participant", () => {
    // 100 / 3 = 33.33... — last gets remainder
    const result = validateAndNormalizeSplits(100, [
      { userId: "u1", percentage: 33.34 },
      { userId: "u2", percentage: 33.33 },
      { userId: "u3", percentage: 33.33 },
    ]);
    const sum = result.reduce((acc, s) => acc + (s.amount ?? 0), 0);
    expect(sum).toBeCloseTo(100, 2);
  });

  it("percentage mode: 50/50 split", () => {
    const result = validateAndNormalizeSplits(200, [
      { userId: "u1", percentage: 50 },
      { userId: "u2", percentage: 50 },
    ]);
    expect(result[0].amount).toBe(100);
    expect(result[1].amount).toBe(100);
  });
});
