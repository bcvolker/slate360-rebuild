function isDevTitle(value: string): boolean {
  return /live smoke|\bx4\b/i.test(value);
}

function stripDevTitle(value?: string | null): string {
  return (value ?? "").replace(/\s*[—-]\s*x4\b.*$/i, "").replace(/\s*x4\b.*$/i, "").replace(/\s*live smoke.*$/i, "").trim();
}

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
  const project = stripDevTitle(input.projectName);
  const title = isDevTitle(raw) ? (project || "Walkthrough") : raw;
  const same = Boolean(project) && project.toLowerCase() === title.toLowerCase();
  const parts = [same ? null : project || null, formatCaptureDay(input.capturedAt)].filter(Boolean);
  return { title, meta: parts.length ? parts.join(" · ") : null };
}
