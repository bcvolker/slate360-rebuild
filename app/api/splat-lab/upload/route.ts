import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { isSplatLabEnabled, SPLAT_LAB_ROOT } from "@/lib/splat-lab/job-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Capture drops can be multi-gigabyte 360 videos; disable the default body
// size limit for this route (still localhost-only, still desktop-gated).
export const maxDuration = 0;

const UPLOAD_ROOT = join(SPLAT_LAB_ROOT, "_uploads");

/**
 * Receives files dropped on the desktop app's drop zone and writes them to a
 * staging folder on disk, since the pipeline needs a real filesystem path
 * (it runs in WSL against a path, not an in-memory blob) and the standard
 * browser File API does not expose a dropped file's absolute path (that was
 * a non-standard, security-sensitive Electron/NW.js extension, never part
 * of the web platform, and modern Chromium/Edge does not set it).
 *
 * Body: multipart/form-data with paired `file` / `relPath` entries (same
 * order) so a folder drop's structure is preserved under the staging dir.
 */
export async function POST(req: Request) {
  if (!isSplatLabEnabled()) {
    return NextResponse.json({ error: "Splat Lab is local-dev only." }, { status: 403 });
  }
  const form = await req.formData();
  const files = form.getAll("file") as File[];
  const relPaths = form.getAll("relPath") as string[];
  if (files.length === 0 || files.length !== relPaths.length) {
    return NextResponse.json({ error: "expected matching file/relPath pairs" }, { status: 400 });
  }

  const uploadId = randomUUID().slice(0, 8);
  const destRoot = join(UPLOAD_ROOT, uploadId);
  mkdirSync(destRoot, { recursive: true });

  let bytesWritten = 0;
  for (let i = 0; i < files.length; i += 1) {
    const relPath = sanitizeRelPath(relPaths[i]);
    if (!relPath) continue;
    const destPath = join(destRoot, relPath);
    if (!normalize(destPath).startsWith(normalize(destRoot) + sep) && normalize(destPath) !== normalize(destRoot)) {
      continue; // refuse anything that tries to escape the staging dir (../..)
    }
    mkdirSync(dirname(destPath), { recursive: true });
    const buf = Buffer.from(await files[i].arrayBuffer());
    writeFileSync(destPath, buf);
    bytesWritten += buf.length;
  }

  return NextResponse.json({ path: destRoot, fileCount: files.length, bytesWritten });
}

function sanitizeRelPath(p: string): string | null {
  const cleaned = p.replace(/\\/g, "/").split("/").filter((seg) => seg && seg !== "." && seg !== "..").join("/");
  return cleaned || null;
}
