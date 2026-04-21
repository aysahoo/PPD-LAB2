/**
 * Remove pre-Blob student PDFs: delete files under UPLOAD_DIR and clear DB columns.
 * Rows pointing at Vercel Blob (path starts with "student-documents/") are skipped.
 *
 * Usage (from Ayush/server):
 *   npm run delete-legacy-local-documents
 *   npm run delete-legacy-local-documents -- --dry-run
 */
import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "../src/db/client.js";
import { users } from "../src/db/schema.js";
import { removeFileByRelpath } from "../src/lib/uploads.js";
import { pool } from "../src/db/pool.js";

const BLOB_PREFIX = "student-documents/";

function isLegacyLocalPath(pathname: string | null): boolean {
  const p = pathname?.trim() ?? "";
  if (!p) return false;
  return !p.startsWith(BLOB_PREFIX);
}

const dryRun = process.argv.includes("--dry-run");

async function main() {
  try {
    const rows = await db.select().from(users).where(eq(users.role, "student"));
    let clearedUsers = 0;
    let clearedAadhaar = 0;
    let clearedRank = 0;

    for (const row of rows) {
      const clearAadhaar = isLegacyLocalPath(row.aadhaarPdfRelpath);
      const clearRank = isLegacyLocalPath(row.rankPdfRelpath);
      if (!clearAadhaar && !clearRank) continue;

      if (dryRun) {
        if (clearAadhaar) {
          console.log(`[dry-run] user ${row.id}: would delete local Aadhaar PDF: ${row.aadhaarPdfRelpath}`);
        }
        if (clearRank) {
          console.log(`[dry-run] user ${row.id}: would delete local rank PDF: ${row.rankPdfRelpath}`);
        }
        clearedUsers += 1;
        if (clearAadhaar) clearedAadhaar += 1;
        if (clearRank) clearedRank += 1;
        continue;
      }

      if (clearAadhaar && row.aadhaarPdfRelpath) {
        await removeFileByRelpath(row.aadhaarPdfRelpath);
        clearedAadhaar += 1;
      }
      if (clearRank && row.rankPdfRelpath) {
        await removeFileByRelpath(row.rankPdfRelpath);
        clearedRank += 1;
      }

      const patch: { aadhaarPdfRelpath?: null; rankPdfRelpath?: null } = {};
      if (clearAadhaar) patch.aadhaarPdfRelpath = null;
      if (clearRank) patch.rankPdfRelpath = null;
      await db.update(users).set(patch).where(eq(users.id, row.id));

      console.log(
        `Cleared user ${row.id}: aadhaar=${clearAadhaar ? "yes" : "no"}, rank=${clearRank ? "yes" : "no"}`,
      );
      clearedUsers += 1;
    }

    console.log(
      dryRun
        ? `[dry-run] ${clearedUsers} student(s) with legacy paths (aadhaar=${clearedAadhaar}, rank=${clearedRank}). No files or DB changes.`
        : `Done. Updated ${clearedUsers} student(s); cleared aadhaar=${clearedAadhaar}, rank=${clearedRank}.`,
    );
  } finally {
    await pool.end();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
