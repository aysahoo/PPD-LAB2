import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate, requireRole } from "../auth/guards.js";
import {
  createAdmin,
  deleteAdminOrDeactivate,
  getDashboard,
  listAdmins,
  listCoursesForAdmin,
  listEnrollmentsForAdmin,
  listStudentsForAdmin,
  reportCourses,
  reportEnrollments,
  reportStudents,
  updateAdmin,
} from "../services/admin.js";

const adminPreHandlers = [authenticate, requireRole("admin")];

const createAdminBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

const updateAdminBody = z.object({
  name: z.string().max(100).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
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

export async function adminRoutes(app: FastifyInstance) {
  app.get("/dashboard", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const data = await getDashboard();
    return reply.send(data);
  });

  app.get("/students", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const list = await listStudentsForAdmin();
    return reply.send(list);
  });

  app.get("/courses", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const list = await listCoursesForAdmin();
    return reply.send(list);
  });

  app.get("/enrollments", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const list = await listEnrollmentsForAdmin();
    return reply.send(list);
  });

  app.get("/reports/enrollments", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const rows = await reportEnrollments();
    return reply.send(rows);
  });

  app.get("/reports/students", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const rows = await reportStudents();
    return reply.send(rows);
  });

  app.get("/reports/courses", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const rows = await reportCourses();
    return reply.send(rows);
  });

  app.get("/admins", { preHandler: adminPreHandlers }, async (_request, reply) => {
    const list = await listAdmins();
    return reply.send(list);
  });

  app.post("/admins", { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = parseBody(createAdminBody, request.body);
    if (!parsed.ok) {
      return reply.code(400).send({ message: parsed.error });
    }
    try {
      const admin = await createAdmin({
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
        phone: parsed.data.phone,
      });
      return reply.code(201).send(admin);
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

  app.put("/admins/:id", { preHandler: adminPreHandlers }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid id" });
    }
    const parsed = parseBody(updateAdminBody, request.body);
    if (!parsed.ok) {
      return reply.code(400).send({ message: parsed.error });
    }
    try {
      const updated = await updateAdmin(id, parsed.data);
      if (!updated) {
        return reply.code(404).send({ message: "Admin not found" });
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

  app.delete("/admins/:id", { preHandler: adminPreHandlers }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid id" });
    }
    const currentUserId = request.user!.id;
    const result = await deleteAdminOrDeactivate(id, currentUserId);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return reply.code(404).send({ message: "Admin not found" });
      }
      if (result.reason === "forbidden") {
        return reply.code(403).send({ message: "Cannot deactivate your own account" });
      }
      return reply.code(400).send({ message: "Cannot remove the last active admin" });
    }
    return reply.send({ message: "Admin deactivated" });
  });
}
