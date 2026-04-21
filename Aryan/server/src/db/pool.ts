import pg from "pg";

import { env } from "../env.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

/** Required: idle clients that error must be handled or the process may crash. */
pool.on("error", (err) => {
  console.error("[pg pool] idle client error:", err.message);
});
