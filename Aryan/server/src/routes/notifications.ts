import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate, requireRole } from "../auth/guards.js";
import {
  createNotificationForAdmin,
  listForUser,
  markReadForUser,
} from "../services/notifications.js";

const adminPreHandlers = [authenticate, requireRole("admin")];

const postBody = z.object({
  userId: z.number().int().positive(),
  body: z.string().min(1).max(4000),
  type: z.string().max(64).nullable().optional(),
});

function parseBody<T>(schema: z.ZodType<T>, body: unknown) {
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.flatten().fieldErrors;
    const first = Object.values(msg).flat()[0] ?? "Invalid request body";
    return { ok: false as const, error: first };
  }
  return { ok: true as const, data: r.data };
}

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function notificationsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: authenticate }, async (request, reply) => {
    const uid = request.user!.id;
    const list = await listForUser(uid);
    return reply.send(list);
  });

  app.post("/", { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = parseBody(postBody, request.body);
    if (!parsed.ok) {
      return reply.code(400).send({ message: parsed.error, code: "VALIDATION_ERROR" });
    }
    const created = await createNotificationForAdmin({
      userId: parsed.data.userId,
      body: parsed.data.body,
      type: parsed.data.type ?? null,
    });
    return reply.code(201).send(created);
  });

  app.put("/:id/read", { preHandler: authenticate }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid notification id", code: "VALIDATION_ERROR" });
    }
    const uid = request.user!.id;
    const result = await markReadForUser(uid, id);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return reply.code(404).send({ message: "Notification not found", code: "NOT_FOUND" });
      }
      return reply.code(403).send({ message: "Forbidden", code: "FORBIDDEN" });
    }
    return reply.send({ message: "Marked as read" });
  });
}
