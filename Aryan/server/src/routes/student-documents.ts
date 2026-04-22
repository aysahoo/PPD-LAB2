import { del, get, head } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { authenticate } from "../auth/guards.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { env } from "../env.js";
import {
  removeFileByRelpath,
  safeAbsolutePath,
  type StudentDocKind,
} from "../lib/uploads.js";
import { getUserById, mapStudent } from "../services/students.js";

const BLOB_PATH_PREFIX = "student-documents/";
const MAX_PDF_BYTES = 5 * 1024 * 1024;
const UPLOAD_GRANT_TTL_MS = 10 * 60 * 1000;

type UploadGrantPayload = {
  studentId: number;
  actorId: number;
  role: "student" | "admin";
  kind: StudentDocKind;
  pathname: string;
  exp: number;
};

function parseId(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseKind(raw: string | undefined): StudentDocKind | null {
  if (raw === "aadhaar" || raw === "rank") return raw;
  return null;
}

function firstHeaderValue(raw: string | string[] | undefined): string | null {
  if (Array.isArray(raw)) return raw[0]?.trim() ?? null;
  if (typeof raw === "string") return raw.trim();
  return null;
}

function requestOrigin(request: FastifyRequest): string {
  const forwardedProto = firstHeaderValue(request.headers["x-forwarded-proto"]);
  const forwardedHost = firstHeaderValue(request.headers["x-forwarded-host"]);
  const host = forwardedHost ?? firstHeaderValue(request.headers.host) ?? "localhost:3000";
  const protocol = forwardedProto ?? request.protocol ?? "http";
  const baseHost = host.split(",")[0]?.trim() || "localhost:3000";
  const baseProtocol = protocol.split(",")[0]?.trim() || "http";
  return `${baseProtocol}://${baseHost}`;
}

function grantSignature(encodedPayload: string): string {
  return createHmac("sha256", env.JWT_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

function signUploadGrant(payload: UploadGrantPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = grantSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyUploadGrant(raw: string): UploadGrantPayload {
  const [encodedPayload, providedSignature] = raw.split(".");
  if (!encodedPayload || !providedSignature) {
    throw new Error("Invalid upload grant");
  }

  const expectedSignature = grantSignature(encodedPayload);
  const expected = Buffer.from(expectedSignature, "utf8");
  const provided = Buffer.from(providedSignature, "utf8");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new Error("Invalid upload grant");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid upload grant payload");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid upload grant payload");
  }
  const payload = parsed as Partial<UploadGrantPayload>;
  if (!Number.isInteger(payload.studentId) || payload.studentId! <= 0) {
    throw new Error("Invalid upload grant payload");
  }
  if (!Number.isInteger(payload.actorId) || payload.actorId! <= 0) {
    throw new Error("Invalid upload grant payload");
  }
  if (payload.role !== "student" && payload.role !== "admin") {
    throw new Error("Invalid upload grant payload");
  }
  if (payload.kind !== "aadhaar" && payload.kind !== "rank") {
    throw new Error("Invalid upload grant payload");
  }
  if (typeof payload.pathname !== "string" || payload.pathname.length === 0) {
    throw new Error("Invalid upload grant payload");
  }
  if (!Number.isFinite(payload.exp)) {
    throw new Error("Invalid upload grant payload");
  }
  return payload as UploadGrantPayload;
}

function isBlobStoredPath(storedPath: string): boolean {
  return storedPath.startsWith(BLOB_PATH_PREFIX);
}

function isExpectedBlobPath(storedPath: string, userId: number, kind: StudentDocKind): boolean {
  return (
    storedPath.startsWith(`${BLOB_PATH_PREFIX}${userId}/${kind}/`) &&
    storedPath.endsWith(".pdf")
  );
}

async function removeStoredDocument(storedPath: string | null): Promise<void> {
  if (!storedPath) return;
  if (isBlobStoredPath(storedPath)) {
    await del(storedPath);
    return;
  }
  await removeFileByRelpath(storedPath);
}

async function authorizeStudentDocumentAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  studentId: number,
) {
  const uid = request.user!.id;
  const role = request.user!.role;
  if (role === "student" && uid !== studentId) {
    reply.code(403).send({ message: "Forbidden" });
    return null;
  }

  const target = await getUserById(studentId);
  if (!target || target.role !== "student") {
    reply.code(404).send({ message: "Student not found" });
    return null;
  }
  return target;
}

export async function studentDocumentRoutes(app: FastifyInstance) {
  app.post(
    "/:id/documents/:kind/upload-authorize",
    { preHandler: [authenticate] },
    requestBlobUploadAuthorization,
  );

  app.post("/:id/documents/:kind/upload", handleBlobUploadRequest);

  app.post(
    "/:id/documents/:kind/attach",
    { preHandler: [authenticate] },
    attachUploadedPdf,
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

async function requestBlobUploadAuthorization(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const id = parseId((request.params as { id: string }).id);
  if (id === null) {
    return reply.code(400).send({ message: "Invalid student id" });
  }
  const kind = parseKind((request.params as { kind?: string }).kind);
  if (!kind) {
    return reply.code(400).send({ message: "Invalid document type" });
  }

  if (!(await authorizeStudentDocumentAccess(request, reply, id))) return;

  const pathname = `${BLOB_PATH_PREFIX}${id}/${kind}/${Date.now()}-${randomUUID()}.pdf`;
  const grant = signUploadGrant({
    studentId: id,
    actorId: request.user!.id,
    role: request.user!.role,
    kind,
    pathname,
    exp: Date.now() + UPLOAD_GRANT_TTL_MS,
  });
  const uploadUrl = `${requestOrigin(request)}/students/${id}/documents/${kind}/upload?grant=${encodeURIComponent(grant)}`;

  return reply.send({ pathname, uploadUrl });
}

async function handleBlobUploadRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const id = parseId((request.params as { id: string }).id);
  if (id === null) {
    return reply.code(400).send({ message: "Invalid student id" });
  }
  const kind = parseKind((request.params as { kind?: string }).kind);
  if (!kind) {
    return reply.code(400).send({ message: "Invalid document type" });
  }

  const grant = (request.query as { grant?: string }).grant;
  if (!grant) {
    return reply.code(400).send({ message: "Missing upload grant" });
  }

  let body: HandleUploadBody;
  try {
    body = request.body as HandleUploadBody;
  } catch {
    return reply.code(400).send({ message: "Invalid upload request body" });
  }

  try {
    const result = await handleUpload({
      body,
      request: request.raw,
      onBeforeGenerateToken: async (pathname) => {
        const parsedGrant = verifyUploadGrant(grant);
        if (parsedGrant.exp < Date.now()) {
          throw new Error("Upload grant has expired");
        }
        if (
          parsedGrant.studentId !== id ||
          parsedGrant.kind !== kind ||
          parsedGrant.pathname !== pathname
        ) {
          throw new Error("Upload grant does not match request");
        }

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_PDF_BYTES,
          validUntil: parsedGrant.exp,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            studentId: parsedGrant.studentId,
            kind: parsedGrant.kind,
            pathname: parsedGrant.pathname,
          }),
        };
      },
      onUploadCompleted: async ({ tokenPayload }) => {
        if (!tokenPayload) return;
        try {
          const parsed = JSON.parse(tokenPayload) as Partial<UploadGrantPayload>;
          if (
            !Number.isInteger(parsed.studentId) ||
            (parsed.kind !== "aadhaar" && parsed.kind !== "rank") ||
            typeof parsed.pathname !== "string"
          ) {
            throw new Error("Invalid upload completion payload");
          }
        } catch {
          throw new Error("Invalid upload completion payload");
        }
      },
    });
    return reply.send(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload request failed";
    return reply.code(400).send({ message });
  }
}

async function attachUploadedPdf(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const id = parseId((request.params as { id: string }).id);
  if (id === null) {
    return reply.code(400).send({ message: "Invalid student id" });
  }
  const kind = parseKind((request.params as { kind?: string }).kind);
  if (!kind) {
    return reply.code(400).send({ message: "Invalid document type" });
  }

  const target = await authorizeStudentDocumentAccess(request, reply, id);
  if (!target) return;

  const body = request.body as { pathname?: unknown } | undefined;
  const pathname = typeof body?.pathname === "string" ? body.pathname.trim() : "";
  if (!pathname) {
    return reply.code(400).send({ message: "Missing pathname" });
  }
  if (!isExpectedBlobPath(pathname, id, kind)) {
    return reply.code(400).send({ message: "Invalid blob pathname" });
  }

  let blobMetadata: Awaited<ReturnType<typeof head>>;
  try {
    blobMetadata = await head(pathname);
  } catch {
    return reply.code(404).send({ message: "Uploaded blob not found" });
  }
  if (!blobMetadata.contentType.startsWith("application/pdf")) {
    return reply.code(400).send({ message: "File must be a PDF" });
  }

  const oldStoredPath =
    kind === "aadhaar" ? target.aadhaarPdfRelpath : target.rankPdfRelpath;
  const patch =
    kind === "aadhaar"
      ? { aadhaarPdfRelpath: pathname }
      : { rankPdfRelpath: pathname };

  let updatedRow: typeof users.$inferSelect | undefined;
  try {
    const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
    updatedRow = row;
    if (!updatedRow) {
      await del(pathname);
      return reply.code(404).send({ message: "Student not found" });
    }
  } catch (err) {
    await del(pathname);
    throw err;
  }

  await removeStoredDocument(oldStoredPath);
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

  if (isBlobStoredPath(relpath)) {
    /** Private blobs require authenticated retrieval via SDK — plain `fetch(downloadUrl)` fails. */
    let blobGet: Awaited<ReturnType<typeof get>>;
    try {
      blobGet = await get(relpath, { access: "private", token: env.BLOB_READ_WRITE_TOKEN });
    } catch {
      return reply.code(404).send({ message: "No file uploaded" });
    }
    if (!blobGet || blobGet.statusCode !== 200 || blobGet.stream === null) {
      return reply.code(404).send({ message: "No file uploaded" });
    }
    const filename = kind === "aadhaar" ? "aadhaar.pdf" : "rank.pdf";
    const contentType = blobGet.blob.contentType.startsWith("application/pdf")
      ? blobGet.blob.contentType
      : "application/pdf";
    try {
      const reader = blobGet.stream.getReader();
      const chunks: Buffer[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.byteLength) chunks.push(Buffer.from(value));
      }
      const body = Buffer.concat(chunks);
      return reply
        .header("Content-Type", contentType)
        .header("Content-Disposition", `inline; filename="${filename}"`)
        .send(body);
    } catch {
      return reply.code(502).send({ message: "Could not fetch document" });
    }
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
