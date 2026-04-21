import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate, requireRole } from "../auth/guards.js";
import {
  deactivateStudent,
  getUserById,
  listStudentEnrollments,
  listStudentNotifications,
  listStudentUsers,
  mapStudent,
  updateStudentProfile,
} from "../services/students.js";

const adminPreHandlers = [authenticate, requireRole("admin")];

const putBody = z.object({
  name: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().optional(),
  aadhaarNumber: z
    .union([z.string(), z.null()])
    .optional()
    .transform((val): string | null | undefined => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const d = val.replace(/\D/g, "");
      return d === "" ? null : d;
    })
    .refine(
      (d) => d === undefined || d === null || /^\d{12}$/.test(d),
      { message: "Aadhaar must be exactly 12 digits" },
    ),
  studentRank: z.union([z.number().int().positive(), z.null()]).optional(),
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

function canAccessStudentProfile(
  requesterId: number,
  requesterRole: "student" | "admin",
  targetStudentId: number,
): boolean {
  if (requesterRole === "admin") return true;
  return requesterId === targetStudentId;
}

export async function studentsRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const list = await listStudentUsers();
    return reply.send(list);
  });

  app.get(
    "/:id/enrollments",
    { preHandler: authenticate },
    async (request, reply) => {
      const id = parseId((request.params as { id: string }).id);
      if (id === null) {
        return reply.code(400).send({ message: "Invalid student id" });
      }
      const uid = request.user!.id;
      const role = request.user!.role;
      if (!canAccessStudentProfile(uid, role, id)) {
        return reply.code(403).send({ message: "Forbidden" });
      }
      const target = await getUserById(id);
      if (!target || target.role !== "student") {
        return reply.code(404).send({ message: "Student not found" });
      }
      const list = await listStudentEnrollments(id);
      return reply.send(list);
    },
  );

  app.get(
    "/:id/notifications",
    { preHandler: authenticate },
    async (request, reply) => {
      const id = parseId((request.params as { id: string }).id);
      if (id === null) {
        return reply.code(400).send({ message: "Invalid student id" });
      }
      const uid = request.user!.id;
      const role = request.user!.role;
      if (!canAccessStudentProfile(uid, role, id)) {
        return reply.code(403).send({ message: "Forbidden" });
      }
      const target = await getUserById(id);
      if (!target || target.role !== "student") {
        return reply.code(404).send({ message: "Student not found" });
      }
      const list = await listStudentNotifications(id);
      return reply.send(list);
    },
  );

  app.get("/:id", { preHandler: authenticate }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid student id" });
    }
    const uid = request.user!.id;
    const role = request.user!.role;
    if (!canAccessStudentProfile(uid, role, id)) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const row = await getUserById(id);
    if (!row || row.role !== "student") {
      return reply.code(404).send({ message: "Student not found" });
    }
    return reply.send(mapStudent(row));
  });

  app.put("/:id", { preHandler: authenticate }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid student id" });
    }
    const uid = request.user!.id;
    const role = request.user!.role;
    if (role === "student" && uid !== id) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const parsed = parseBody(putBody, request.body);
    if (!parsed.ok) {
      return reply.code(400).send({ message: parsed.error });
    }
    const target = await getUserById(id);
    if (!target || target.role !== "student") {
      return reply.code(404).send({ message: "Student not found" });
    }
    try {
      const updated = await updateStudentProfile(id, parsed.data);
      if (!updated) {
        return reply.code(404).send({ message: "Student not found" });
      }
      return reply.send(updated);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        return reply.code(409).send({ message: "Email already in use" });
      }
      throw err;
    }
  });

  app.delete("/:id", { preHandler: adminPreHandlers }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid student id" });
    }
    const ok = await deactivateStudent(id);
    if (!ok) {
      return reply.code(404).send({ message: "Student not found" });
    }
    return reply.send({ message: "Student deactivated" });
  });
}
