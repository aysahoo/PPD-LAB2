import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }),
    email: varchar("email", { length: 100 }).notNull().unique(),
    phone: varchar("phone", { length: 20 }),
    /** Normalized 12-digit Aadhaar (digits only); collected for student enrollment eligibility. */
    aadhaarNumber: varchar("aadhaar_number", { length: 12 }),
    /** Entrance or qualifying exam rank (positive integer). */
    studentRank: integer("student_rank"),
    /** Relative path under UPLOAD_DIR for uploaded Aadhaar PDF (local dev storage). */
    aadhaarPdfRelpath: varchar("aadhaar_pdf_relpath", { length: 512 }),
    /** Relative path under UPLOAD_DIR for uploaded rank certificate PDF. */
    rankPdfRelpath: varchar("rank_pdf_relpath", { length: 512 }),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    isActive: boolean("is_active").default(true),
  },
  () => [check("users_role_check", sql`role IN ('student', 'admin')`)],
);

export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 32 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    credits: integer("credits").notNull().default(3),
    capacity: integer("capacity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  () => [
    check("courses_capacity_positive", sql`capacity > 0`),
    check("courses_credits_positive", sql`credits > 0`),
  ],
);

export const coursePrerequisites = pgTable(
  "course_prerequisites",
  {
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    prerequisiteCourseId: integer("prerequisite_course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.courseId, t.prerequisiteCourseId] }),
    check(
      "course_prerequisites_distinct",
      sql`course_id != prerequisite_course_id`,
    ),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "enrollments_status_check",
      sql`status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`,
    ),
    uniqueIndex("enrollments_user_id_course_id_unique").on(
      t.userId,
      t.courseId,
    ),
  ],
);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  type: varchar("type", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** JWT IDs revoked by logout (server-side invalidation until original exp). */
export const revokedTokens = pgTable("revoked_tokens", {
  jti: varchar("jti", { length: 36 }).primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
