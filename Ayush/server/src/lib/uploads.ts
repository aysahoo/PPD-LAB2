import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../env.js";

const PDF_MAGIC = Buffer.from("%PDF");

export function getUploadRoot(): string {
  const raw = env.UPLOAD_DIR.trim();
  if (path.isAbsolute(raw)) {
    return path.normalize(raw);
  }
  return path.resolve(process.cwd(), raw);
}

export async function ensureUploadRoot(): Promise<string> {
  const root = getUploadRoot();
  await mkdir(root, { recursive: true });
  return root;
}

/** Resolve DB relpath to absolute path; returns null if outside upload root. */
export function safeAbsolutePath(relpath: string): string | null {
  const root = getUploadRoot();
  const resolved = path.resolve(root, relpath);
  const normalizedRoot = path.resolve(root);
  const sep = path.sep;
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + sep)) {
    return null;
  }
  return resolved;
}

export function isPdfMagic(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).equals(PDF_MAGIC);
}

export type StudentDocKind = "aadhaar" | "rank";

/** POSIX-style relative path stored in DB (works with path.resolve on all platforms). */
export function newRelativePath(userId: number, kind: StudentDocKind): string {
  const idPart = String(Math.floor(userId));
  const prefix = kind === "aadhaar" ? "aadhaar" : "rank";
  return `${idPart}/${prefix}-${randomUUID()}.pdf`;
}

export async function writePdfBuffer(relpath: string, buf: Buffer): Promise<void> {
  const root = await ensureUploadRoot();
  const abs = path.join(root, relpath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, buf);
}

export async function removeFileByRelpath(relpath: string | null): Promise<void> {
  if (!relpath) return;
  const abs = safeAbsolutePath(relpath);
  if (!abs) return;
  try {
    await unlink(abs);
  } catch (err: unknown) {
    const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: string }).code : "";
    if (code !== "ENOENT") throw err;
  }
}
