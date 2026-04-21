import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { listMine, type EnrollmentResponse } from "./enrollments.js";
import { listForUser, type NotificationResponse } from "./notifications.js";

export type StudentResponse = {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  aadhaarNumber: string | null;
  studentRank: number | null;
  aadhaarPdfUploaded: boolean;
  rankPdfUploaded: boolean;
  role: "student" | "admin";
  isActive: boolean;
};

export function mapStudent(row: typeof users.$inferSelect): StudentResponse {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    aadhaarNumber: row.aadhaarNumber,
    studentRank: row.studentRank,
    aadhaarPdfUploaded: Boolean(row.aadhaarPdfRelpath?.trim()),
    rankPdfUploaded: Boolean(row.rankPdfRelpath?.trim()),
    role: row.role as "student" | "admin",
    isActive: row.isActive ?? true,
  };
}

export async function listStudentUsers(): Promise<StudentResponse[]> {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "student")))
    .orderBy(asc(users.email));

  return rows.map(mapStudent);
}

export async function getUserById(id: number): Promise<typeof users.$inferSelect | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function updateStudentProfile(
  id: number,
  data: Partial<{
    name: string | null;
    phone: string | null;
    email: string;
    aadhaarNumber: string | null;
    studentRank: number | null;
  }>,
): Promise<StudentResponse | null> {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing || existing.role !== "student") {
    return null;
  }

  const patch: Partial<typeof users.$inferInsert> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.email !== undefined) patch.email = data.email;
  if (data.aadhaarNumber !== undefined) patch.aadhaarNumber = data.aadhaarNumber;
  if (data.studentRank !== undefined) patch.studentRank = data.studentRank;

  const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  return row ? mapStudent(row) : null;
}

export async function deactivateStudent(id: number): Promise<boolean> {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing || existing.role !== "student") {
    return false;
  }
  await db.update(users).set({ isActive: false }).where(eq(users.id, id));
  return true;
}

export async function listStudentNotifications(
  userId: number,
): Promise<NotificationResponse[]> {
  return listForUser(userId);
}

export async function listStudentEnrollments(userId: number): Promise<EnrollmentResponse[]> {
  return listMine(userId);
}
