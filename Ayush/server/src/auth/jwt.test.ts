import { describe, it, expect } from "vitest";

import { signAccessToken, verifyAccessToken } from "./jwt.js";

describe("jwt", () => {
  it("round-trips user id, jti, and exp", async () => {
    const token = await signAccessToken(42, "student");
    const { userId, jti, exp } = await verifyAccessToken(token);
    expect(userId).toBe(42);
    expect(jti).toMatch(/^[0-9a-f-]{36}$/i);
    expect(exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects garbage", async () => {
    await expect(verifyAccessToken("not-a-jwt")).rejects.toThrow();
  });
});
