import { and, asc, count, eq, inArray } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  coursePrerequisites,
  courses,
  enrollments,
  users,
} from "../db/schema.js";
import { isStudentProfileComplete } from "../lib/student-profile.js";
import { insertNotification } from "./notifications.js";

export const enrollmentStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

export type StudentSummary = {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  role: "student" | "admin";
  isActive: boolean;
};

export type CourseSummary = {
  id: number;
  code: string;
  title: string;
};

export type EnrollmentResponse = {
  id: number;
  userId: number;
  courseId: number;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  course: CourseSummary;
  student: StudentSummary;
};

function mapUser(row: typeof users.$inferSelect): StudentSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role as "student" | "admin",
    isActive: row.isActive ?? true,
  };
}

function mapCourse(row: Pick<typeof courses.$inferSelect, "id" | "code" | "title">): CourseSummary {
  return { id: row.id, code: row.code, title: row.title };
}

async function toResponse(
  row: typeof enrollments.$inferSelect,
  courseRow: typeof courses.$inferSelect,
  userRow: typeof users.$inferSelect,
): Promise<EnrollmentResponse> {
  return {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    status: row.status as EnrollmentStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    course: mapCourse(courseRow),
    student: mapUser(userRow),
  };
}

async function loadEnrollmentResponse(id: number): Promise<EnrollmentResponse | null> {
  const [row] = await db
    .select({
      enrollment: enrollments,
      course: courses,
      user: users,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(users, eq(enrollments.userId, users.id))
    .where(eq(enrollments.id, id))
    .limit(1);

  if (!row) return null;
  return toResponse(row.enrollment, row.course, row.user);
}

export async function listMine(userId: number): Promise<EnrollmentResponse[]> {
  const rows = await db
    .select({
      enrollment: enrollments,
      course: courses,
      user: users,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(users, eq(enrollments.userId, users.id))
    .where(eq(enrollments.userId, userId))
    .orderBy(asc(enrollments.createdAt));

  return Promise.all(rows.map((r) => toResponse(r.enrollment, r.course, r.user)));
}

export async function listAllForAdmin(): Promise<EnrollmentResponse[]> {
  const rows = await db
    .select({
      enrollment: enrollments,
      course: courses,
      user: users,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(users, eq(enrollments.userId, users.id))
    .orderBy(asc(enrollments.createdAt));

  return Promise.all(rows.map((r) => toResponse(r.enrollment, r.course, r.user)));
}

export async function getById(id: number): Promise<EnrollmentResponse | null> {
  return loadEnrollmentResponse(id);
}

async function prerequisitesSatisfied(userId: number, courseId: number): Promise<boolean> {
  const prereqs = await db
    .select({ pid: coursePrerequisites.prerequisiteCourseId })
    .from(coursePrerequisites)
    .where(eq(coursePrerequisites.courseId, courseId));

  if (prereqs.length === 0) return true;

  const ids = prereqs.map((p) => p.pid);
  const approved = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.status, "APPROVED"),
        inArray(enrollments.courseId, ids),
      ),
    );

  const have = new Set(approved.map((a) => a.courseId));
  return ids.every((id) => have.has(id));
}

export type CreateEnrollmentResult =
  | { ok: true; enrollment: EnrollmentResponse }
  | {
      ok: false;
      reason:
        | "course_not_found"
        | "prerequisites_not_met"
        | "already_pending_or_approved"
        | "at_capacity_enroll"
        | "forbidden"
        | "profile_incomplete";
    };

export async function createOrRequestEnrollment(
  userId: number,
  userRole: "student" | "admin",
  courseId: number,
): Promise<CreateEnrollmentResult> {
  if (userRole !== "student") {
    return { ok: false, reason: "forbidden" };
  }

  const [actor] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!actor) {
    return { ok: false, reason: "forbidden" };
  }
  if (
    !isStudentProfileComplete(
      actor.name,
      actor.phone,
      actor.aadhaarNumber,
      actor.studentRank,
      actor.aadhaarPdfRelpath,
      actor.rankPdfRelpath,
    )
  ) {
    return { ok: false, reason: "profile_incomplete" };
  }

  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) {
    return { ok: false, reason: "course_not_found" };
  }

  const [approvedCountRow] = await db
    .select({ n: count() })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "APPROVED")));
  const approvedCount = Number(approvedCountRow?.n ?? 0);
  if (approvedCount >= course.capacity) {
    return { ok: false, reason: "at_capacity_enroll" };
  }

  if (!(await prerequisitesSatisfied(userId, courseId))) {
    return { ok: false, reason: "prerequisites_not_met" };
  }

  const [existing] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .limit(1);

  const now = new Date();

  if (!existing) {
    const [inserted] = await db
      .insert(enrollments)
      .values({
        userId,
        courseId,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inserted) {
      throw new Error("Insert failed");
    }
    const res = await loadEnrollmentResponse(inserted.id);
    if (!res) throw new Error("Load failed");
    return { ok: true, enrollment: res };
  }

  if (existing.status === "PENDING" || existing.status === "APPROVED") {
    return { ok: false, reason: "already_pending_or_approved" };
  }

  if (existing.status === "REJECTED" || existing.status === "CANCELLED") {
    const [updated] = await db
      .update(enrollments)
      .set({ status: "PENDING", updatedAt: now })
      .where(eq(enrollments.id, existing.id))
      .returning();

    if (!updated) throw new Error("Update failed");
    const res = await loadEnrollmentResponse(updated.id);
    if (!res) throw new Error("Load failed");
    return { ok: true, enrollment: res };
  }

  return { ok: false, reason: "already_pending_or_approved" };
}

export type MutateResult =
  | { ok: true; enrollment: EnrollmentResponse }
  | { ok: false; reason: "not_found" | "invalid_status" | "at_capacity" };

export async function approveEnrollment(enrollmentId: number): Promise<MutateResult> {
  const [row] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId)).limit(1);
  if (!row || row.status !== "PENDING") {
    return { ok: false, reason: row ? "invalid_status" : "not_found" };
  }

  const [course] = await db.select().from(courses).where(eq(courses.id, row.courseId)).limit(1);
  if (!course) {
    return { ok: false, reason: "not_found" };
  }

  const [cnt] = await db
    .select({ n: count() })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, row.courseId), eq(enrollments.status, "APPROVED")));

  const approvedCount = Number(cnt?.n ?? 0);
  if (approvedCount >= course.capacity) {
    return { ok: false, reason: "at_capacity" };
  }

  const body = `Your enrollment in ${course.code} ${course.title} was approved.`;

  await db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(enrollments)
      .set({ status: "APPROVED", updatedAt: now })
      .where(eq(enrollments.id, enrollmentId));
    await insertNotification(tx, {
      userId: row.userId,
      body,
      type: "ENROLLMENT_APPROVED",
    });
  });

  const res = await loadEnrollmentResponse(enrollmentId);
  if (!res) return { ok: false, reason: "not_found" };
  return { ok: true, enrollment: res };
}

export async function rejectEnrollment(enrollmentId: number): Promise<MutateResult> {
  const [row] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId)).limit(1);
  if (!row || row.status !== "PENDING") {
    return { ok: false, reason: row ? "invalid_status" : "not_found" };
  }

  const [course] = await db.select().from(courses).where(eq(courses.id, row.courseId)).limit(1);
  if (!course) {
    return { ok: false, reason: "not_found" };
  }

  const body = `Your enrollment in ${course.code} ${course.title} was rejected.`;

  await db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(enrollments)
      .set({ status: "REJECTED", updatedAt: now })
      .where(eq(enrollments.id, enrollmentId));
    await insertNotification(tx, {
      userId: row.userId,
      body,
      type: "ENROLLMENT_REJECTED",
    });
  });

  const res = await loadEnrollmentResponse(enrollmentId);
  if (!res) return { ok: false, reason: "not_found" };
  return { ok: true, enrollment: res };
}

export type CancelResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "invalid_status" };

export async function cancelEnrollment(
  enrollmentId: number,
  actorUserId: number,
  actorRole: "student" | "admin",
): Promise<CancelResult> {
  const [row] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId)).limit(1);
  if (!row) {
    return { ok: false, reason: "not_found" };
  }

  if (actorRole === "student") {
    if (row.userId !== actorUserId) {
      return { ok: false, reason: "forbidden" };
    }
  }

  if (row.status !== "PENDING" && row.status !== "APPROVED") {
    return { ok: false, reason: "invalid_status" };
  }

  const now = new Date();
  await db
    .update(enrollments)
    .set({ status: "CANCELLED", updatedAt: now })
    .where(eq(enrollments.id, enrollmentId));

  return { ok: true };
}
