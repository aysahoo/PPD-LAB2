import { eq } from "drizzle-orm";
import { createReadStream } from "node:fs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { authenticate } from "../auth/guards.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import {
  isPdfMagic,
  newRelativePath,
  removeFileByRelpath,
  safeAbsolutePath,
  writePdfBuffer,
  type StudentDocKind,
} from "../lib/uploads.js";
import { getUserById, mapStudent } from "../services/students.js";

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function studentDocumentRoutes(app: FastifyInstance) {
  app.post(
    "/:id/documents/aadhaar",
    { preHandler: [authenticate] },
    async (request, reply) => handleStudentPdfUpload(request, reply, "aadhaar"),
  );

  app.post(
    "/:id/documents/rank",
    { preHandler: [authenticate] },
    async (request, reply) => handleStudentPdfUpload(request, reply, "rank"),
  );

  app.get(
    "/:id/documents/aadhaar",
    { preHandler: [authenticate] },
    async (request, reply) => sendStudentPdf(request, reply, "aadhaar"),
  );

  app.get(
    "/:id/documents/rank",
    { preHandler: [authenticate] },
    async (request, reply) => sendStudentPdf(request, reply, "rank"),
  );
}

async function handleStudentPdfUpload(
  request: FastifyRequest,
  reply: FastifyReply,
  kind: StudentDocKind,
) {
  const id = parseId((request.params as { id: string }).id);
  if (id === null) {
    return reply.code(400).send({ message: "Invalid student id" });
  }
  const uid = request.user!.id;
  const role = request.user!.role;
  if (role === "student" && uid !== id) {
    return reply.code(403).send({ message: "Forbidden" });
  }
  const target = await getUserById(id);
  if (!target || target.role !== "student") {
    return reply.code(404).send({ message: "Student not found" });
  }

  if (!request.isMultipart()) {
    return reply.code(400).send({ message: "Expected multipart form data" });
  }

  let part: Awaited<ReturnType<FastifyRequest["file"]>>;
  try {
    part = await request.file();
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "FST_REQ_FILE_TOO_LARGE") {
      return reply.code(413).send({ message: "File too large (max 5 MB)" });
    }
    throw err;
  }

  if (!part || part.type !== "file") {
    return reply.code(400).send({ message: 'Expected one file field named "file"' });
  }
  if (part.fieldname !== "file") {
    return reply.code(400).send({ message: 'Expected file field name "file"' });
  }

  const buf = await part.toBuffer();
  if (!isPdfMagic(buf)) {
    return reply.code(400).send({ message: "File must be a PDF" });
  }

  const relpath = newRelativePath(id, kind);
  const oldRel = kind === "aadhaar" ? target.aadhaarPdfRelpath : target.rankPdfRelpath;

  try {
    await writePdfBuffer(relpath, buf);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "file_too_large") {
      return reply.code(413).send({ message: "File too large (max 5 MB)" });
    }
    throw err;
  }

  const patch =
    kind === "aadhaar"
      ? { aadhaarPdfRelpath: relpath }
      : { rankPdfRelpath: relpath };

  let updatedRow: typeof users.$inferSelect | undefined;
  try {
    const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
    updatedRow = row;
    if (!updatedRow) {
      await removeFileByRelpath(relpath);
      return reply.code(404).send({ message: "Student not found" });
    }
  } catch (err) {
    await removeFileByRelpath(relpath);
    throw err;
  }

  await removeFileByRelpath(oldRel);
  return reply.send(mapStudent(updatedRow));
}

async function sendStudentPdf(
  request: FastifyRequest,
  reply: FastifyReply,
  kind: StudentDocKind,
) {
  const id = parseId((request.params as { id: string }).id);
  if (id === null) {
    return reply.code(400).send({ message: "Invalid student id" });
  }
  const uid = request.user!.id;
  const role = request.user!.role;
  if (role === "student" && uid !== id) {
    return reply.code(403).send({ message: "Forbidden" });
  }
  const row = await getUserById(id);
  if (!row || row.role !== "student") {
    return reply.code(404).send({ message: "Student not found" });
  }
  const relpath =
    kind === "aadhaar" ? row.aadhaarPdfRelpath : row.rankPdfRelpath;
  if (!relpath?.trim()) {
    return reply.code(404).send({ message: "No file uploaded" });
  }
  const abs = safeAbsolutePath(relpath);
  if (!abs) {
    return reply.code(500).send({ message: "Invalid stored path" });
  }
  const filename = kind === "aadhaar" ? "aadhaar.pdf" : "rank.pdf";
  return reply
    .header("Content-Type", "application/pdf")
    .header("Content-Disposition", `inline; filename="${filename}"`)
    .send(createReadStream(abs));
}
