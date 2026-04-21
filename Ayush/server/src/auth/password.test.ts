import { describe, it, expect } from "vitest";

import { hashPassword, verifyPassword } from "./password.js";

describe("password", () => {
  it("verifies a hash produced from the same plaintext", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(await verifyPassword("correct-horse-battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
