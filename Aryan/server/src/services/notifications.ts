import { desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { notifications, users } from "../db/schema.js";

/** Executor for inserts (root `db` or transaction). */
export type DbLike = NodePgDatabase<typeof schema>;

export type NotificationResponse = {
  id: number;
  userId: number;
  body: string;
  read: boolean;
  type: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: typeof notifications.$inferSelect): NotificationResponse {
  return {
    id: row.id,
    userId: row.userId,
    body: row.body,
    read: row.read,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function insertNotification(
  executor: DbLike,
  input: { userId: number; body: string; type?: string | null },
): Promise<NotificationResponse> {
  const now = new Date();
  const [row] = await executor
    .insert(notifications)
    .values({
      userId: input.userId,
      body: input.body,
      read: false,
      type: input.type ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert notification");
  }
  return mapRow(row);
}

export async function listForUser(userId: number): Promise<NotificationResponse[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
  return rows.map(mapRow);
}

export type MarkReadResult =
  | { ok: true; notification: NotificationResponse }
  | { ok: false; reason: "not_found" | "forbidden" };

export async function markReadForUser(
  userId: number,
  notificationId: number,
): Promise<MarkReadResult> {
  const [row] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);
  if (!row) {
    return { ok: false, reason: "not_found" };
  }
  if (row.userId !== userId) {
    return { ok: false, reason: "forbidden" };
  }
  if (row.read) {
    return { ok: true, notification: mapRow(row) };
  }
  const now = new Date();
  const [updated] = await db
    .update(notifications)
    .set({ read: true, updatedAt: now })
    .where(eq(notifications.id, notificationId))
    .returning();
  if (!updated) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, notification: mapRow(updated) };
}

export type CreateNotificationForAdminResult =
  | { ok: true; notification: NotificationResponse }
  | { ok: false; reason: "user_not_found" };

export async function createNotificationForAdmin(input: {
  email: string;
  body: string;
  type?: string | null;
}): Promise<CreateNotificationForAdminResult> {
  const normalized = input.email.trim().toLowerCase();
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  if (!u) {
    return { ok: false, reason: "user_not_found" };
  }
  const notification = await insertNotification(db, {
    userId: u.id,
    body: input.body,
    type: input.type ?? null,
  });
  return { ok: true, notification };
}
