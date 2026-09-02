export function formatCaptureDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

export function viewerChromeCopy(input: {
  title: string;
  projectName?: string | null;
  capturedAt?: string | null;
}): { title: string; meta: string | null } {
  const raw = input.title.trim();
  const title = /live smoke|\bx4\b/i.test(raw) ? (input.projectName?.trim() || "Walkthrough") : raw;
  const project = (input.projectName ?? "").trim();
  const same = Boolean(project) && project.toLowerCase() === title.toLowerCase();
  const parts = [same ? null : project || null, formatCaptureDay(input.capturedAt)].filter(Boolean);
  return { title, meta: parts.length ? parts.join(" · ") : null };
}
