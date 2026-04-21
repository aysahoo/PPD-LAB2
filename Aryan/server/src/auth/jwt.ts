import { randomUUID } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

import { env } from "../env.js";

const encoder = new TextEncoder();

function getSecret() {
  return encoder.encode(env.JWT_SECRET);
}

export type VerifiedAccessToken = {
  userId: number;
  /** Empty for legacy tokens issued before `jti` was added (not server-revocable). */
  jti: string;
  /** Unix timestamp (seconds) when the token expires */
  exp: number;
};

export async function signAccessToken(userId: number, role: "student" | "admin") {
  const secret = getSecret();
  const jti = randomUUID();
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  const sub = payload.sub;
  if (typeof sub !== "string" || !Number.isFinite(Number(sub))) {
    throw new Error("Invalid token payload");
  }
  const exp = payload.exp;
  if (typeof exp !== "number") {
    throw new Error("Invalid token payload");
  }
  const jtiRaw = payload.jti;
  const jti = typeof jtiRaw === "string" && jtiRaw.length > 0 ? jtiRaw : "";
  return { userId: Number(sub), jti, exp };
}
