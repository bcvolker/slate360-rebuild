"use client";

import { useState } from "react";
import type { HubTwinProject } from "@/lib/types/digital-twin-hub";
import { formatVisitTitle } from "@/lib/digital-twin/quick-scan-title";

export type NamedCaptureDestination = {
  title: string;
  projectId: string | null;
  quickScan: boolean;
};

type Props = {
  projects: HubTwinProject[];
  lockedProjectId?: string | null;
  onContinue: (dest: NamedCaptureDestination) => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
};

export function TwinCaptureNameGate({
  projects,
  lockedProjectId = null,
  onContinue,
  onCancel,
  busy = false,
  error = null,
}: Props) {
  const locked = projects.find((p) => p.id === lockedProjectId) ?? null;
  const [title, setTitle] = useState(formatVisitTitle);
  const [projectId, setProjectId] = useState(locked?.id ?? projects[0]?.id ?? "");
  const [fileLater, setFileLater] = useState(!locked && projects.length === 0);

  const trimmed = title.trim();
  const canGo = trimmed.length > 0 && !busy && (fileLater || Boolean(projectId) || Boolean(locked));

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Name this visit</h1>
        <p className="mt-1 text-sm text-[var(--graphite-muted)]">
          LiDAR, photos, and later 360 land on this label — not a dump of untitled scans.
        </p>
      </div>

      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
          Visit name
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-zinc-100 outline-none focus:border-[color-mix(in_srgb,var(--twin360-blue)_50%,transparent)]"
        />
      </label>

      {locked ? (
        <p className="text-sm text-zinc-300">
          Project <span className="font-semibold text-zinc-100">{locked.name}</span>
        </p>
      ) : (
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
            Project
          </span>
          <select
            value={fileLater ? "" : projectId}
            disabled={fileLater}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-zinc-100 outline-none disabled:opacity-40"
          >
            {projects.length === 0 ? <option value="">No projects yet</option> : null}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="mt-2 flex items-center gap-2 text-xs text-[var(--graphite-muted)]">
            <input
              type="checkbox"
              checked={fileLater}
              onChange={(e) => setFileLater(e.target.checked)}
            />
            File under a project later
          </label>
        </label>
      )}

      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 flex-1 rounded-xl border border-white/10 text-sm font-semibold text-[var(--graphite-text-body)]"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canGo}
          onClick={() =>
            onContinue({
              title: trimmed,
              projectId: locked?.id ?? (fileLater ? null : projectId || null),
              quickScan: !locked && (fileLater || !projectId),
            })
          }
          className="min-h-12 flex-[2] rounded-xl bg-[var(--twin360-blue)] text-sm font-semibold text-[var(--graphite-canvas)] disabled:opacity-40"
        >
          {busy ? "Preparing…" : "Start capture"}
        </button>
      </div>
    </div>
  );
}
