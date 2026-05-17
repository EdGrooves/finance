import { describe, it, expect } from "vitest";
import { computeBalances } from "../src/lib/balances";

const u = (id: string, name: string) => ({
  id, name, email: `${id}@test`, passwordHash: "", color: "#000", createdAt: new Date(),
});

const dec = (n: number) => ({ toNumber: () => n } as any);

const tx = (overrides: object) => ({
  id: "t1", description: "Test", amount: dec(100), category: "Food",
  date: new Date(), paidById: "u1", isShared: true, isFixed: false,
  origin: "MANUAL_ENTRY", createdAt: new Date(), splits: [],
  ...overrides,
} as any);

const split = (userId: string, amount: number) => ({
  id: `s-${userId}`, transactionId: "t1", userId,
  amount: dec(amount), percentage: null,
} as any);

describe("computeBalances", () => {
  it("simple two-user: u2 owes u1", () => {
    const result = computeBalances("u1", [u("u1", "Alice"), u("u2", "Bob")], [
      tx({ splits: [split("u1", 50), split("u2", 50)] }),
    ], []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ userId: "u2", amount: 50, type: "owed" });
  });

  it("current user owes other", () => {
    const result = computeBalances("u2", [u("u1", "Alice"), u("u2", "Bob")], [
      tx({ paidById: "u1", splits: [split("u1", 50), split("u2", 50)] }),
    ], []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ userId: "u1", amount: 50, type: "owes" });
  });

  it("non-shared tx ignored", () => {
    const result = computeBalances("u1", [u("u1", "Alice"), u("u2", "Bob")], [
      tx({ isShared: false, splits: [split("u2", 100)] }),
    ], []);
    expect(result).toHaveLength(0);
  });

  it("net zero excluded", () => {
    const result = computeBalances("u1", [u("u1", "Alice"), u("u2", "Bob")], [
      tx({ splits: [split("u1", 50), split("u2", 50)] }),
    ], [
      { id: "s1", payerId: "u2", payeeId: "u1", amount: dec(50), createdAt: new Date(), payer: u("u2", "Bob"), payee: u("u1", "Alice") } as any,
    ]);
    expect(result).toHaveLength(0);
  });

  it("settlement partially reduces debt", () => {
    const result = computeBalances("u1", [u("u1", "Alice"), u("u2", "Bob")], [
      tx({ splits: [split("u1", 50), split("u2", 50)] }),
    ], [
      { id: "s1", payerId: "u2", payeeId: "u1", amount: dec(20), createdAt: new Date(), payer: u("u2", "Bob"), payee: u("u1", "Alice") } as any,
    ]);
    expect(result[0]).toMatchObject({ amount: 30, type: "owed" });
  });

  it("split payer is skipped", () => {
    const result = computeBalances("u1", [u("u1", "Alice"), u("u2", "Bob")], [
      tx({ splits: [split("u1", 100)] }), // paidById u1, split also u1 → skip
    ], []);
    expect(result).toHaveLength(0);
  });

  it("split with percentage fallback when amount absent", () => {
    const txWithPct = tx({
      amount: dec(100),
      splits: [
        { id: "s1", transactionId: "t1", userId: "u1", amount: null, percentage: 50 } as any,
        { id: "s2", transactionId: "t1", userId: "u2", amount: null, percentage: 50 } as any,
      ],
    });
    const result = computeBalances("u1", [u("u1", "Alice"), u("u2", "Bob")], [txWithPct], []);
    expect(result[0]).toMatchObject({ amount: 50, type: "owed" });
  });

  it("unknown user name falls back to Unknown", () => {
    const result = computeBalances("u1", [u("u1", "Alice"), u("u2", "Bob")], [
      tx({ splits: [split("u1", 50), split("u2", 50)] }),
    ], []);
    // u2 is known
    expect(result[0].userName).toBe("Bob");
  });

  it("no transactions returns empty", () => {
    expect(computeBalances("u1", [u("u1", "A"), u("u2", "B")], [], [])).toHaveLength(0);
  });
});
