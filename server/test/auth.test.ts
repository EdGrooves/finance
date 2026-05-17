import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../src/lib/auth";

describe("signToken / verifyToken", () => {
  it("round-trips userId", () => {
    const token = signToken({ userId: "abc123" });
    expect(typeof token).toBe("string");
    const payload = verifyToken(token);
    expect(payload.userId).toBe("abc123");
  });

  it("throws on tampered token", () => {
    const token = signToken({ userId: "u1" });
    expect(() => verifyToken(token + "tampered")).toThrow();
  });

  it("throws on garbage input", () => {
    expect(() => verifyToken("not.a.token")).toThrow();
  });
});
