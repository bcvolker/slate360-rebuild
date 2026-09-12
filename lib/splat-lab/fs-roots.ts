/**
 * Fixed, allow-listed filesystem roots for the desktop Input card's folder
 * browser. This endpoint is only ever mounted behind the localhost-only
 * `/splat-lab-desktop` gate (see app/splat-lab-desktop/layout.tsx), but it
 * still refuses to list or resolve anything outside these roots as a second
 * layer of defense — this is local job control, never meant to browse the
 * whole filesystem.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, normalize, resolve, sep } from "node:path";

const HOME = homedir();

export const ALLOWED_ROOTS: string[] = [
  join(HOME, "Desktop"),
  join(HOME, "Documents"),
  join(HOME, "Slate360Jobs"),
  join(HOME, "Videos"),
].filter((p) => existsSync(p));

const VIDEO_EXTS = new Set([".mp4", ".mov", ".m4v", ".webm", ".avi", ".insv"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png"]);

export type FsEntry = {
  name: string;
  path: string;
  isDir: boolean;
  kind?: "video" | "image" | "other";
  sizeBytes?: number;
};

function isUnderAnyRoot(path: string): boolean {
  const normalized = normalize(path);
  return ALLOWED_ROOTS.some((root) => {
    const normRoot = normalize(root);
    return normalized === normRoot || normalized.startsWith(normRoot + sep);
  });
}

/** Resolves and validates a requested path. Returns null if outside the allow-list. */
export function resolveSafePath(requested: string | null | undefined): string | null {
  if (!requested) return ALLOWED_ROOTS[0] ?? null;
  const resolved = resolve(requested);
  if (!isUnderAnyRoot(resolved) && !ALLOWED_ROOTS.includes(resolved)) return null;
  return resolved;
}

export function listDirectory(dirPath: string): { entries: FsEntry[]; parent: string | null } {
  const entries: FsEntry[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(dirPath);
  } catch {
    return { entries: [], parent: null };
  }
  for (const name of names) {
    if (name.startsWith(".")) continue;
    const full = join(dirPath, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      entries.push({ name, path: full, isDir: true });
      continue;
    }
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
    const kind = VIDEO_EXTS.has(ext) ? "video" : IMAGE_EXTS.has(ext) ? "image" : "other";
    if (kind === "other") continue;
    entries.push({ name, path: full, isDir: false, kind, sizeBytes: st.size });
  }
  entries.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  const isRoot = ALLOWED_ROOTS.includes(normalize(dirPath));
  const parent = isRoot ? null : resolve(dirPath, "..");
  return { entries, parent };
}
