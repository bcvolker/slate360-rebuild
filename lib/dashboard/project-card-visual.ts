export type ProjectCardMeta = Record<string, unknown> | null | undefined;

export function isFixtureProject(name: string, metadata: ProjectCardMeta): boolean {
  const meta = metadata && typeof metadata === "object" ? metadata : {};
  if (meta.twin_quick_scan_pool === true) return true;
  if (typeof meta.system_project === "string") return true;
  if (/^quick scans?$/i.test(name.trim())) return true;
  if (/quick scan/i.test(name) && name.trim().length < 24) return true;
  if (/^test$/i.test(name.trim())) return true;
  if (/^untitled|^unnamed|^new project$/i.test(name.trim())) return true;
  return false;
}

export function projectDisplayName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed || isFixtureProject(trimmed, null)) return "";
  return trimmed;
}

export function projectThumbUrl(input: {
  thumbnailUrl?: string | null;
  heroUrl?: string | null;
  posterUrl?: string | null;
  coverUrl?: string | null;
}): string | null {
  return input.heroUrl || input.posterUrl || input.coverUrl || input.thumbnailUrl || null;
}
