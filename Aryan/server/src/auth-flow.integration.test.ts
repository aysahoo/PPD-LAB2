import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { buildApp } from "./app.js";

const RUN = process.env.RUN_DB_INTEGRATION === "1";

describe.skipIf(!RUN)("DB integration: register + login", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({ logger: false, enableSwagger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a student and returns a JWT on login", async () => {
    const email = `vitest-${Date.now()}@example.com`;
    const password = "password12345";

    const reg = await app.inject({
      method: "POST",
      url: "/auth/register",
      headers: { "content-type": "application/json" },
      payload: { email, password },
    });
    expect(reg.statusCode).toBe(201);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "content-type": "application/json" },
      payload: { email, password },
    });
    expect(login.statusCode).toBe(200);
    const body = JSON.parse(login.body) as { accessToken: string; tokenType: string };
    expect(body.tokenType).toBe("Bearer");
    expect(body.accessToken.length).toBeGreaterThan(20);
  });
});
