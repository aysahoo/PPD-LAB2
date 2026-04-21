/**
 * Promote an existing user to admin (for local QA). Registration only creates students.
 *
 * Usage (from repo root):
 *   npm run promote-admin -w server -- you@example.com
 */
import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "../src/db/client.js";
import { users } from "../src/db/schema.js";
import { pool } from "../src/db/pool.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run promote-admin -w server -- <email>");
  process.exit(1);
}

try {
  const [updated] = await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, email))
    .returning({ id: users.id, email: users.email });

  if (!updated) {
    console.error(`No user with email: ${email}`);
    process.exit(1);
  }

  console.log(`Updated ${updated.email} (id=${updated.id}) to role admin.`);
} finally {
  await pool.end();
}
