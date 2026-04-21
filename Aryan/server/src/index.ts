import Fastify from "fastify";

import { buildApp } from "./create-app.js";
import { env } from "./env.js";

// Vercel Fastify framework scan requires this entry file to import `fastify` directly.
void Fastify;

async function main() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
