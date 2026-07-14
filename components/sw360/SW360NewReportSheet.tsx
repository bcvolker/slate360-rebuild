"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import type { ProjectWalkOption } from "@/lib/projects/load-project-deliverables-data";

const TYPE_LABELS: Record<string, string> = {
  punchlist: "Punch list",
  photo_log: "Photo log",
  field_report: "Field report",
};
const TYPES = Object.keys(TYPE_LABELS);

/**
 * Generates a real deliverable via the existing one-tap
 * POST /api/site-walk/sessions/[id]/quick-deliverable endpoint (already
 * templates punch-list/photo-log/field-report content from the walk's
 * items — this was previously unreachable from the SW360 shell, so Reports
 * could only export deliverables that already existed).
 */
export function SW360NewReportSheet({
  walks,
  onClose,
}: {
  walks: ProjectWalkOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [walkId, setWalkId] = useState(walks[0]?.id ?? "");
  const [type, setType] = useState<string>("punchlist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!walkId) {
      setError("Choose a walk.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-walk/sessions/${walkId}/quick-deliverable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Couldn't generate the report.");
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate the report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--sw360-bone)] p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/70">
            New report
          </p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} className="text-[var(--sw360-charcoal)]/60" />
          </button>
        </div>

        {walks.length === 0 ? (
          <p className="text-sm text-[var(--sw360-charcoal)]/60">
            Start a walk on this project first — a report needs items to summarize.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <select
              value={walkId}
              onChange={(e) => setWalkId(e.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--sw360-charcoal)]"
            >
              {walks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={
                    type === t
                      ? "flex-1 rounded-lg bg-[var(--sw360-green-light)] px-2 py-2 text-xs font-bold text-white"
                      : "flex-1 rounded-lg border border-[var(--border)] px-2 py-2 text-xs font-bold text-[var(--sw360-charcoal)]/70"
                  }
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {error ? <p className="text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}

            <button
              type="button"
              disabled={busy}
              onClick={() => void generate()}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-green-light)] text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Generate report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
