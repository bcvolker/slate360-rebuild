"use client";

import { useMemo, useState } from "react";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";
import { formatVisitTitle, isQuickScanPoolName } from "@/lib/digital-twin/quick-scan-title";

/**
 * Where this walk files. Project = the job. Space = the twin (stable name, e.g. "Kitchen").
 * Visit = this dated walk; its label lands on the capture, never on the space.
 */
export type NamedCaptureDestination = {
  projectId: string | null;
  /** True when filing into the Quick Scans pool (shown as Unfiled). */
  quickScan: boolean;
  /** Existing space to walk again, or null to create `spaceTitle`. */
  spaceId: string | null;
  spaceTitle: string;
  visitTitle: string;
};

type Props = {
  projects: HubTwinProject[];
  spaces: HubTwin[];
  lockedProjectId?: string | null;
  onContinue: (dest: NamedCaptureDestination) => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
};

const UNFILED = "__unfiled__";
const NEW_SPACE = "__new__";
const field =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-[var(--graphite-text-header)] outline-none focus:border-[color-mix(in_srgb,var(--twin360-blue)_50%,transparent)] disabled:opacity-40";
const label = "text-[11px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]";

export function TwinCaptureNameGate({ projects, spaces, lockedProjectId = null, onContinue, onCancel, busy = false, error = null }: Props) {
  const locked = projects.find((p) => p.id === lockedProjectId) ?? null;
  const jobs = useMemo(() => projects.filter((p) => !isQuickScanPoolName(p.name)), [projects]);
  const [projectChoice, setProjectChoice] = useState<string>(locked?.id ?? jobs[0]?.id ?? UNFILED);
  const [spaceChoice, setSpaceChoice] = useState<string>(NEW_SPACE);
  const [newSpace, setNewSpace] = useState("");
  const [visitTitle, setVisitTitle] = useState(formatVisitTitle);

  const projectId = locked?.id ?? (projectChoice === UNFILED ? null : projectChoice);
  const quickScan = projectId === null;
  const existing = useMemo(
    () => spaces.filter((s) => (quickScan ? isQuickScanPoolName(s.projectName) : s.projectId === projectId)),
    [spaces, projectId, quickScan],
  );
  const chosen = existing.find((s) => s.id === spaceChoice) ?? null;
  const spaceTitle = chosen ? chosen.title : newSpace.trim();
  const canGo = !busy && spaceTitle.length > 0 && visitTitle.trim().length > 0;

  const pickProject = (value: string) => { setProjectChoice(value); setSpaceChoice(NEW_SPACE); };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-[var(--graphite-text-header)]">Name this walk</h1>
        <p className="mt-1 text-sm text-[var(--graphite-muted)]">Choose the job and the space. Every walk files under them, and repeat walks build one twin.</p>
      </div>

      {locked ? (
        <p className="text-sm text-[var(--graphite-text-body)]">Project <span className="font-semibold text-[var(--graphite-text-header)]">{locked.name}</span></p>
      ) : (
        <label className="block">
          <span className={label}>Project</span>
          <select value={projectChoice} onChange={(e) => pickProject(e.target.value)} className={field} data-testid="twin-gate-project">
            {jobs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value={UNFILED}>{jobs.length ? "No project yet — file later" : "No projects yet — scan unfiled"}</option>
          </select>
          {quickScan ? <p className="mt-2 text-xs text-[var(--graphite-muted)]">This walk lands in Unfiled. Move it to a job from the twin screen any time.</p> : null}
        </label>
      )}

      <div>
        <span className={label}>Space</span>
        {existing.length ? (
          <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Space">
            {existing.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={spaceChoice === s.id} onClick={() => setSpaceChoice(s.id)}
                className={`min-h-10 rounded-xl border px-3 text-sm ${spaceChoice === s.id ? "border-[var(--twin360-blue)] text-[var(--graphite-text-header)]" : "border-white/10 text-[var(--graphite-text-body)]"}`}>
                {s.title}
              </button>
            ))}
            <button type="button" role="radio" aria-checked={spaceChoice === NEW_SPACE} onClick={() => setSpaceChoice(NEW_SPACE)}
              className={`min-h-10 rounded-xl border px-3 text-sm ${spaceChoice === NEW_SPACE ? "border-[var(--twin360-blue)] text-[var(--graphite-text-header)]" : "border-white/10 text-[var(--graphite-text-body)]"}`}>
              + New space
            </button>
          </div>
        ) : null}
        {spaceChoice === NEW_SPACE ? (
          <input value={newSpace} onChange={(e) => setNewSpace(e.target.value)} maxLength={80} autoFocus placeholder="Kitchen, Room 205, Level 2 corridor" className={field} data-testid="twin-gate-space" />
        ) : (
          <p className="mt-2 text-xs text-[var(--graphite-muted)]">Walking <span className="text-[var(--graphite-text-body)]">{chosen?.title}</span> again — this visit joins its timeline.</p>
        )}
      </div>

      <label className="block">
        <span className={label}>This walk</span>
        <input value={visitTitle} onChange={(e) => setVisitTitle(e.target.value)} maxLength={80} className={field} data-testid="twin-gate-visit" />
        <p className="mt-2 text-xs text-[var(--graphite-muted)]">Defaults to now. LiDAR and photos from this walk file here.</p>
      </label>

      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}

      <div className="mt-auto flex gap-2">
        <button type="button" onClick={onCancel} className="min-h-12 flex-1 rounded-xl border border-white/10 text-sm font-semibold text-[var(--graphite-text-body)]">Back</button>
        <button type="button" disabled={!canGo} data-testid="twin-gate-start"
          onClick={() => onContinue({ projectId, quickScan, spaceId: chosen?.id ?? null, spaceTitle, visitTitle: visitTitle.trim() })}
          className="min-h-12 flex-[2] rounded-xl bg-[var(--twin360-blue)] text-sm font-semibold text-[var(--graphite-canvas)] disabled:opacity-40">
          {busy ? "Preparing…" : "Start capture"}
        </button>
      </div>
    </div>
  );
}
