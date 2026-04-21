import { eq, lt } from "drizzle-orm";

import { db } from "../db/client.js";
import { revokedTokens } from "../db/schema.js";

/** Remove expired rows so the table stays small. */
async function purgeExpiredRevocations() {
  await db.delete(revokedTokens).where(lt(revokedTokens.expiresAt, new Date()));
}

export async function revokeAccessTokenJti(jti: string, expiresAt: Date) {
  await purgeExpiredRevocations();
  await db.insert(revokedTokens).values({ jti, expiresAt }).onConflictDoNothing();
}

export async function isAccessTokenJtiRevoked(jti: string): Promise<boolean> {
  await purgeExpiredRevocations();
  const [row] = await db.select({ jti: revokedTokens.jti }).from(revokedTokens).where(eq(revokedTokens.jti, jti)).limit(1);
  return !!row;
}
