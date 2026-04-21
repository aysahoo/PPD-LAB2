import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { authenticate, requireRole } from "../auth/guards.js";
import {
  addPrerequisite,
  createCourse,
  deleteCourse,
  getCourseById,
  listCourses,
  listStudentsForCourse,
  removePrerequisite,
  updateCourse,
} from "../services/courses.js";

const adminPreHandlers = [authenticate, requireRole("admin")];

const createBody = z.object({
  code: z.string().min(1).max(32),
  title: z.string().min(1).max(200),
  description: z.string(),
  credits: z.number().int().positive(),
  capacity: z.number().int().positive(),
});

const updateBody = z.object({
  code: z.string().min(1).max(32).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  credits: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
});

const prerequisiteBody = z.object({
  prerequisiteCourseId: z.number().int().positive(),
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

export async function coursesRoutes(app: FastifyInstance) {
  app.get("/", async (_request, reply) => {
    const list = await listCourses();
    return reply.send(list);
  });

  app.get("/:id/students", { preHandler: adminPreHandlers }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid course id" });
    }
    const course = await getCourseById(id);
    if (!course) {
      return reply.code(404).send({ message: "Course not found" });
    }
    const students = await listStudentsForCourse(id);
    return reply.send(students);
  });

  app.post(
    "/:id/prerequisites",
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const id = parseId((request.params as { id: string }).id);
      if (id === null) {
        return reply.code(400).send({ message: "Invalid course id" });
      }
      const parsed = parseBody(prerequisiteBody, request.body);
      if (!parsed.ok) {
        return reply.code(400).send({ message: parsed.error });
      }
      const course = await getCourseById(id);
      if (!course) {
        return reply.code(404).send({ message: "Course not found" });
      }
      const result = await addPrerequisite(id, parsed.data.prerequisiteCourseId);
      if (!result.ok) {
        if (result.reason === "not_found") {
          return reply.code(404).send({ message: "Course not found" });
        }
        if (result.reason === "self") {
          return reply.code(400).send({ message: "A course cannot be its own prerequisite" });
        }
        if (result.reason === "duplicate") {
          return reply.code(409).send({ message: "Prerequisite already added" });
        }
        return reply.code(400).send({ message: "Prerequisite would create a cycle" });
      }
      return reply.code(201).send({ message: "Prerequisite added" });
    },
  );

  app.delete(
    "/:id/prerequisites/:prereqCourseId",
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const id = parseId((request.params as { id: string }).id);
      const prereqId = parseId((request.params as { prereqCourseId: string }).prereqCourseId);
      if (id === null || prereqId === null) {
        return reply.code(400).send({ message: "Invalid id" });
      }
      const course = await getCourseById(id);
      if (!course) {
        return reply.code(404).send({ message: "Course not found" });
      }
      const removed = await removePrerequisite(id, prereqId);
      if (!removed) {
        return reply.code(404).send({ message: "Prerequisite not found" });
      }
      return reply.send({ message: "Prerequisite removed" });
    },
  );

  app.get("/:id", async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid course id" });
    }
    const course = await getCourseById(id);
    if (!course) {
      return reply.code(404).send({ message: "Course not found" });
    }
    return reply.send(course);
  });

  app.post("/", { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = parseBody(createBody, request.body);
    if (!parsed.ok) {
      return reply.code(400).send({ message: parsed.error });
    }
    try {
      const course = await createCourse(parsed.data);
      return reply.code(201).send(course);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        return reply.code(409).send({ message: "Course code already exists" });
      }
      throw err;
    }
  });

  app.put("/:id", { preHandler: adminPreHandlers }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid course id" });
    }
    const parsed = parseBody(updateBody, request.body);
    if (!parsed.ok) {
      return reply.code(400).send({ message: parsed.error });
    }
    if (Object.keys(parsed.data).length === 0) {
      return reply.code(400).send({ message: "No fields to update" });
    }
    try {
      const course = await updateCourse(id, parsed.data);
      if (!course) {
        return reply.code(404).send({ message: "Course not found" });
      }
      return reply.send(course);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        return reply.code(409).send({ message: "Course code already exists" });
      }
      throw err;
    }
  });

  app.delete("/:id", { preHandler: adminPreHandlers }, async (request, reply) => {
    const id = parseId((request.params as { id: string }).id);
    if (id === null) {
      return reply.code(400).send({ message: "Invalid course id" });
    }
    const ok = await deleteCourse(id);
    if (!ok) {
      return reply.code(404).send({ message: "Course not found" });
    }
    return reply.send({ message: "Course deleted" });
  });
}
