"use client";

export type TourMobileProject = { id: string; name: string };

/**
 * Native <select> (not a custom dropdown) — on iOS this opens the OS picker
 * wheel, which is the expected mobile pattern and needs no explanation.
 * Leaving it on the default "360 Library" option is a valid, intentional
 * choice (not a missing step) — every tour needs a project internally, and
 * project-less tours land in a hidden per-org holding area automatically.
 */
export function TourMobileProjectPicker({
  projects,
  selectedProjectId,
  onChange,
}: {
  projects: TourMobileProject[];
  selectedProjectId: string | null;
  onChange: (projectId: string | null) => void;
}) {
  if (projects.length === 0) return null;

  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
        Attach to project
      </span>
      <select
        value={selectedProjectId ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[var(--graphite-text-body)]"
      >
        <option value="">360 Library (not assigned to a project)</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
