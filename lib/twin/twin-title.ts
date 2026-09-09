/** Twin names: one line, whitespace-collapsed, bounded. Shared by the rename route and the phone sheet. */

export const TWIN_TITLE_MAX = 120;

export function normalizeTwinTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.replace(/\s+/g, " ").trim();
  if (!title || title.length > TWIN_TITLE_MAX) return null;
  return title;
}
