"use client";

import { useState } from "react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";

/** Route-level capture instructions (camera heights, forward direction), editable on screen, plain text in print. */
export function CaptureCardControls({ projectId, notes }: { projectId: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? "");
  const [saved, setSaved] = useState(notes ?? "");
  const [status, setStatus] = useState<string | null>(null);

  const save = async () => {
    const res = await fetch(`/api/projects/${projectId}/tour`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ captureNotes: value }),
    });
    if (!res.ok) return setStatus("Could not save. Try again.");
    setSaved(value);
    setStatus("Saved.");
  };

  return (
    <div className="space-y-2">
      {saved ? <p className="hidden whitespace-pre-line text-sm print:block">{saved}</p> : null}
      <div className="space-y-2 print:hidden">
        <textarea
          className="min-h-24 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent p-3 text-sm text-[var(--graphite-text-header)]"
          placeholder={"Camera heights, forward direction, required close-ups.\nExample: High mast 7 ft, low 4 ft. Walk with the mast ahead. Close-ups of every sleeve and fire-stop."}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setStatus(null);
          }}
          aria-label="Capture instructions"
        />
        <div className="flex flex-wrap items-center gap-2">
          {value !== saved ? (
            <button type="button" className={t.primaryButton} onClick={save}>
              Save instructions
            </button>
          ) : (
            <button type="button" className={t.primaryButton} onClick={() => window.print()}>
              Print card
            </button>
          )}
          {status ? <span className="text-xs text-[var(--graphite-muted)]" role="status">{status}</span> : null}
        </div>
      </div>
    </div>
  );
}
