import { and, asc, count, eq, ne } from "drizzle-orm";

import { db } from "../db/client.js";
import { courses, enrollments, users } from "../db/schema.js";
import { listCourses } from "./courses.js";
import { listAllForAdmin, type EnrollmentResponse } from "./enrollments.js";
import { listStudentUsers, mapStudent, type StudentResponse } from "./students.js";
import { hashPassword } from "../auth/password.js";

export type DashboardResponse = {
  studentCount: number;
  courseCount: number;
  enrollmentCounts: {
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
};

export type ReportRow = {
  key: string;
  value: number;
};

export async function getDashboard(): Promise<DashboardResponse> {
  const [studentRow] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "student"), eq(users.isActive, true)));

  const [courseRow] = await db.select({ n: count() }).from(courses);

  const statusCounts = await db
    .select({
      status: enrollments.status,
      n: count(),
    })
    .from(enrollments)
    .groupBy(enrollments.status);

  const byStatus: Record<string, number> = {};
  for (const r of statusCounts) {
    byStatus[r.status] = Number(r.n);
  }

  return {
    studentCount: Number(studentRow?.n ?? 0),
    courseCount: Number(courseRow?.n ?? 0),
    enrollmentCounts: {
      pending: byStatus.PENDING ?? 0,
      approved: byStatus.APPROVED ?? 0,
      rejected: byStatus.REJECTED ?? 0,
      cancelled: byStatus.CANCELLED ?? 0,
    },
  };
}

export async function reportEnrollments(): Promise<ReportRow[]> {
  const rows = await db
    .select({
      status: enrollments.status,
      n: count(),
    })
    .from(enrollments)
    .groupBy(enrollments.status);

  return rows.map((r) => ({
    key: `status:${r.status}`,
    value: Number(r.n),
  }));
}

export async function reportStudents(): Promise<ReportRow[]> {
  const [active] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "student"), eq(users.isActive, true)));

  const [inactive] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "student"), eq(users.isActive, false)));

  return [
    { key: "activeStudents", value: Number(active?.n ?? 0) },
    { key: "inactiveStudents", value: Number(inactive?.n ?? 0) },
  ];
}

export async function reportCourses(): Promise<ReportRow[]> {
  const [courseRow] = await db.select({ n: count() }).from(courses);

  const approvedByCourse = await db
    .select({
      courseId: enrollments.courseId,
      n: count(),
    })
    .from(enrollments)
    .where(eq(enrollments.status, "APPROVED"))
    .groupBy(enrollments.courseId);

  const out: ReportRow[] = [{ key: "totalCourses", value: Number(courseRow?.n ?? 0) }];
  for (const r of approvedByCourse) {
    out.push({
      key: `approvedEnrollments:courseId:${r.courseId}`,
      value: Number(r.n),
    });
  }
  return out;
}

export type AdminUserResponse = StudentResponse;

export async function listAdmins(): Promise<AdminUserResponse[]> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.email));

  return rows.map(mapStudent);
}

export async function createAdmin(data: {
  email: string;
  password: string;
  name?: string | null;
  phone?: string | null;
}): Promise<AdminUserResponse> {
  const passwordHash = await hashPassword(data.password);
  const [inserted] = await db
    .insert(users)
    .values({
      email: data.email.trim(),
      passwordHash,
      name: data.name ?? null,
      phone: data.phone ?? null,
      role: "admin",
      isActive: true,
    })
    .returning();

  if (!inserted) throw new Error("Insert failed");
  return mapStudent(inserted);
}

export async function updateAdmin(
  id: number,
  data: Partial<{ name: string | null; phone: string | null; email: string; isActive: boolean }>,
): Promise<AdminUserResponse | null> {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing || existing.role !== "admin") {
    return null;
  }

  const patch: Partial<typeof users.$inferInsert> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.email !== undefined) patch.email = data.email;
  if (data.isActive !== undefined) patch.isActive = data.isActive;

  const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  return row ? mapStudent(row) : null;
}

export async function deleteAdminOrDeactivate(
  id: number,
  currentUserId: number,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "forbidden" | "last_admin" }> {
  if (id === currentUserId) {
    return { ok: false, reason: "forbidden" };
  }

  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing || existing.role !== "admin") {
    return { ok: false, reason: "not_found" };
  }

  const [otherActive] = await db
    .select({ n: count() })
    .from(users)
    .where(
      and(eq(users.role, "admin"), eq(users.isActive, true), ne(users.id, id)),
    );

  if (existing.isActive && Number(otherActive?.n ?? 0) === 0) {
    return { ok: false, reason: "last_admin" };
  }

  await db.update(users).set({ isActive: false }).where(eq(users.id, id));
  return { ok: true };
}

/** Re-export list helpers for /admin/* aliases */
export async function listCoursesForAdmin() {
  return listCourses();
}

export async function listEnrollmentsForAdmin(): Promise<EnrollmentResponse[]> {
  return listAllForAdmin();
}

export async function listStudentsForAdmin(): Promise<StudentResponse[]> {
  return listStudentUsers();
}
