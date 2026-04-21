import type { FastifyReply, FastifyRequest } from "fastify";

import { eq } from "drizzle-orm";

import { verifyAccessToken } from "./jwt.js";
import { isAccessTokenJtiRevoked } from "./revocation.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ message: "Missing or invalid authorization" });
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return reply.code(401).send({ message: "Missing or invalid authorization" });
  }
  try {
    const { userId, jti } = await verifyAccessToken(token);
    if (jti && (await isAccessTokenJtiRevoked(jti))) {
      return reply.code(401).send({ message: "Token has been revoked" });
    }
    const [row] = await db
      .select({
        id: users.id,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row || !row.isActive) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
    if (row.role !== "student" && row.role !== "admin") {
      return reply.code(401).send({ message: "Unauthorized" });
    }
    request.user = { id: row.id, role: row.role };
  } catch {
    return reply.code(401).send({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: ("student" | "admin")[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ message: "Forbidden" });
    }
  };
}
