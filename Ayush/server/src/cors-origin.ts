import type { Env } from "./env.js";

/** Matches @fastify/cors `OriginCallback` second parameter (reflect or explicit origin). */
type CorsOriginReply = string | boolean | RegExp;

/**
 * Resolves CORS `origin` for @fastify/cors.
 *
 * Browsers send an exact string (e.g. `http://localhost:5174` vs `http://127.0.0.1:5174`) —
 * those are different origins. In development we allow both hostnames for the Vite ports so
 * local login works even if `CLIENT_ORIGIN` only lists `localhost`.
 */
export function createCorsOriginCallback(env: Env) {
  const allowed = new Set(env.CLIENT_ORIGIN);

  return (
    origin: string | undefined,
    cb: (err: Error | null, allowedOrigin: CorsOriginReply) => void,
  ) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    if (allowed.has(origin)) {
      cb(null, true);
      return;
    }
    if (env.NODE_ENV === "development") {
      try {
        const u = new URL(origin);
        if (
          (u.hostname === "localhost" || u.hostname === "127.0.0.1") &&
          ["5173", "5174", "5175"].includes(u.port)
        ) {
          cb(null, true);
          return;
        }
      } catch {
        /* invalid origin */
      }
    }
    cb(new Error("Not allowed by CORS"), false);
  };
}
