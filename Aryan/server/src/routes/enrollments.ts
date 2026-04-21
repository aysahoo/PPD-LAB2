import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate, requireRole } from "../auth/guards.js";
import {
  approveEnrollment,
  cancelEnrollment,
  createOrRequestEnrollment,
  getById,
  listAllForAdmin,
  listMine,
  rejectEnrollment,
} from "../services/enrollments.js";

const adminPreHandlers = [authenticate, requireRole("admin")];
const studentPreHandlers = [authenticate, requireRole("student")];

const postBody = z.object({
  courseId: z.number().int().positive(),
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

export async function enrollmentsRoutes(app: FastifyInstance) {
  app.get("/mine", { preHandler: studentPreHandlers }, async (request, reply) => {
    const uid = request.user!.id;
    const list = await listMine(uid);
    return reply.send(list);
  });

  app.get("/", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const list = await listAllForAdmin();
    return reply.send(list);
  });

  app.post("/", { preHandler: studentPreHandlers }, async (request, reply) => {
    const parsed = parseBody(postBody, request.body);
    if (!parsed.ok) {
      return reply.code(400).send({ message: parsed.error });
    }
    const uid = request.user!.id;
    const role = request.user!.role;
    const result = await createOrRequestEnrollment(uid, role, parsed.data.courseId);
    if (!result.ok) {
      if (result.reason === "course_not_found") {
        return reply.code(404).send({ message: "Course not found" });
      }
      if (result.reason === "prerequisites_not_met") {
        return reply.code(400).send({
          message: "Prerequisites not satisfied — complete required courses first.",
        });
      }
      if (result.reason === "profile_incomplete") {
        return reply.code(400).send({
          message:
            "Complete your profile (name, phone, 12-digit Aadhaar, rank, and Aadhaar and rank PDFs) on your account page before requesting enrollment.",
        });
      }
      if (result.reason === "already_pending_or_approved") {
        return reply.code(409).send({ message: "Already enrolled or pending approval" });
      }
      if (result.reason === "at_capacity_enroll") {
        return reply
          .code(409)
          .send({ message: "Course is at capacity; no new enrollment requests are accepted." });
      }
      return reply.code(403).send({ message: "Only students can enroll" });
    }
    return reply.code(201).send(result.enrollment);
  });

  app.put("/:id/approve", { preHandler: adminPreHandlers }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid enrollment id" });
    }
    const result = await approveEnrollment(id);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return reply.code(404).send({ message: "Enrollment not found" });
      }
      if (result.reason === "at_capacity") {
        return reply.code(409).send({ message: "Course is at capacity" });
      }
      return reply.code(400).send({ message: "Enrollment cannot be approved" });
    }
    return reply.send(result.enrollment);
  });

  app.put("/:id/reject", { preHandler: adminPreHandlers }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid enrollment id" });
    }
    const result = await rejectEnrollment(id);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return reply.code(404).send({ message: "Enrollment not found" });
      }
      return reply.code(400).send({ message: "Enrollment cannot be rejected" });
    }
    return reply.send(result.enrollment);
  });

  app.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid enrollment id" });
    }
    const actorId = request.user!.id;
    const actorRole = request.user!.role;
    const result = await cancelEnrollment(id, actorId, actorRole);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return reply.code(404).send({ message: "Enrollment not found" });
      }
      if (result.reason === "forbidden") {
        return reply.code(403).send({ message: "Forbidden" });
      }
      return reply.code(400).send({ message: "Enrollment cannot be cancelled" });
    }
    return reply.send({ message: "Enrollment cancelled" });
  });

  app.get("/:id", { preHandler: authenticate }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid enrollment id" });
    }
    const enrollment = await getById(id);
    if (!enrollment) {
      return reply.code(404).send({ message: "Enrollment not found" });
    }
    const role = request.user!.role;
    const uid = request.user!.id;
    if (role === "student" && enrollment.userId !== uid) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    return reply.send(enrollment);
  });
}
