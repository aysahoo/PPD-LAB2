import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { coursePrerequisites, courses, enrollments, users } from "../db/schema.js";

export type PrerequisiteSummary = {
  id: number;
  code: string;
  title: string;
};

export type CourseResponse = {
  id: number;
  code: string;
  title: string;
  description: string;
  credits: number;
  capacity: number;
  createdAt: string;
  updatedAt: string;
  prerequisites: PrerequisiteSummary[];
};

function mapRow(row: typeof courses.$inferSelect, prerequisites: PrerequisiteSummary[]): CourseResponse {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    credits: row.credits,
    capacity: row.capacity,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    prerequisites,
  };
}

async function loadPrerequisiteSummaries(courseId: number): Promise<PrerequisiteSummary[]> {
  const rows = await db
    .select({
      id: courses.id,
      code: courses.code,
      title: courses.title,
    })
    .from(coursePrerequisites)
    .innerJoin(courses, eq(coursePrerequisites.prerequisiteCourseId, courses.id))
    .where(eq(coursePrerequisites.courseId, courseId))
    .orderBy(asc(courses.code));

  return rows.map((r) => ({ id: r.id, code: r.code, title: r.title }));
}

export async function listCourses(): Promise<CourseResponse[]> {
  const rows = await db.select().from(courses).orderBy(asc(courses.code));
  return rows.map((row) => mapRow(row, []));
}

export async function getCourseById(id: number): Promise<CourseResponse | null> {
  const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!row) return null;
  const prerequisites = await loadPrerequisiteSummaries(row.id);
  return mapRow(row, prerequisites);
}

export async function createCourse(data: {
  code: string;
  title: string;
  description: string;
  credits: number;
  capacity: number;
}): Promise<CourseResponse> {
  const [row] = await db
    .insert(courses)
    .values({
      code: data.code.trim(),
      title: data.title.trim(),
      description: data.description,
      credits: data.credits,
      capacity: data.capacity,
    })
    .returning();
  if (!row) throw new Error("Insert failed");
  return mapRow(row, []);
}

export async function updateCourse(
  id: number,
  data: Partial<{ code: string; title: string; description: string; credits: number; capacity: number }>,
): Promise<CourseResponse | null> {
  const [existing] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!existing) return null;

  const patch: Partial<typeof courses.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.code !== undefined) patch.code = data.code.trim();
  if (data.title !== undefined) patch.title = data.title.trim();
  if (data.description !== undefined) patch.description = data.description;
  if (data.credits !== undefined) patch.credits = data.credits;
  if (data.capacity !== undefined) patch.capacity = data.capacity;

  const [row] = await db.update(courses).set(patch).where(eq(courses.id, id)).returning();
  if (!row) return null;
  const prerequisites = await loadPrerequisiteSummaries(row.id);
  return mapRow(row, prerequisites);
}

export async function deleteCourse(id: number): Promise<boolean> {
  const deleted = await db.delete(courses).where(eq(courses.id, id)).returning({ id: courses.id });
  return deleted.length > 0;
}

/** Students with APPROVED enrollment for this course. */
export async function listStudentsForCourse(courseId: number): Promise<
  {
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
    role: "student" | "admin";
    isActive: boolean;
  }[]
> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.userId, users.id))
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "APPROVED")));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role as "student" | "admin",
    isActive: r.isActive ?? true,
  }));
}

async function hasPathFromPrerequisiteToCourse(
  prerequisiteId: number,
  targetCourseId: number,
): Promise<boolean> {
  const queue: number[] = [prerequisiteId];
  const seen = new Set<number>([prerequisiteId]);

  while (queue.length > 0) {
    const node = queue.shift()!;
    const rows = await db
      .select({ courseId: coursePrerequisites.courseId })
      .from(coursePrerequisites)
      .where(eq(coursePrerequisites.prerequisiteCourseId, node));

    for (const { courseId: c } of rows) {
      if (c === targetCourseId) return true;
      if (!seen.has(c)) {
        seen.add(c);
        queue.push(c);
      }
    }
  }
  return false;
}

export async function addPrerequisite(
  courseId: number,
  prerequisiteCourseId: number,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "self" | "duplicate" | "cycle" }> {
  if (courseId === prerequisiteCourseId) {
    return { ok: false, reason: "self" };
  }

  const [c1] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).limit(1);
  const [c2] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, prerequisiteCourseId))
    .limit(1);
  if (!c1 || !c2) {
    return { ok: false, reason: "not_found" };
  }

  const [dup] = await db
    .select()
    .from(coursePrerequisites)
    .where(
      and(
        eq(coursePrerequisites.courseId, courseId),
        eq(coursePrerequisites.prerequisiteCourseId, prerequisiteCourseId),
      ),
    )
    .limit(1);
  if (dup) {
    return { ok: false, reason: "duplicate" };
  }

  if (await hasPathFromPrerequisiteToCourse(prerequisiteCourseId, courseId)) {
    return { ok: false, reason: "cycle" };
  }

  await db.insert(coursePrerequisites).values({
    courseId,
    prerequisiteCourseId,
  });
  return { ok: true };
}

export async function removePrerequisite(
  courseId: number,
  prerequisiteCourseId: number,
): Promise<boolean> {
  const deleted = await db
    .delete(coursePrerequisites)
    .where(
      and(
        eq(coursePrerequisites.courseId, courseId),
        eq(coursePrerequisites.prerequisiteCourseId, prerequisiteCourseId),
      ),
    )
    .returning({ courseId: coursePrerequisites.courseId });

  return deleted.length > 0;
}
