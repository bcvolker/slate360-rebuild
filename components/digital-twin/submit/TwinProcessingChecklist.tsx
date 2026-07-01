"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import {
  TWIN_ETA_LABEL,
  TWIN_STAGES,
  elapsedSecondsSince,
  formatElapsed,
  resolveActiveStageIndex,
} from "./twin-processing-stages";

type Props = {
  stage: string | null;
  startedAt: string | null;
};

/**
 * Staged processing checklist — ✓ done (neutral) / ◉ active (twin-blue + spinner) /
 * ○ pending (muted). Ticks once a second so the elapsed timer advances and the
 * time-based fallback keeps the active stage moving even if a worker signal is lost.
 */
export function TwinProcessingChecklist({ stage, startedAt }: Props) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = nowMs != null ? elapsedSecondsSince(startedAt, nowMs) : null;
  const activeIndex = resolveActiveStageIndex(stage, elapsed);

  return (
    <div className="space-y-4" data-twin-submit="processing-checklist">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
          Reconstructing
        </p>
        <p className="font-mono text-[11px] tabular-nums text-[var(--graphite-text-body)]">
          {formatElapsed(elapsed)}
        </p>
      </div>

      <ol className="space-y-1.5">
        {TWIN_STAGES.map((s, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <li
              key={s.key}
              data-stage={s.key}
              data-state={done ? "done" : active ? "active" : "pending"}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                active
                  ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)]"
                  : "border-transparent",
              )}
            >
              <StageMarker done={done} active={active} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-mono text-[11px] uppercase tracking-[0.12em]",
                    active
                      ? twinAccent.text
                      : done
                        ? "text-[var(--graphite-text-body)]"
                        : "text-[var(--graphite-muted)]",
                  )}
                >
                  {s.label}
                </p>
                {active ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--graphite-muted)]">{s.hint}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-center text-[11px] text-[var(--graphite-muted)]">{TWIN_ETA_LABEL}</p>
    </div>
  );
}

function StageMarker({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--mobile-app-card-border)] text-[var(--graphite-text-body)]">
        <IconCheck className="h-3.5 w-3.5" stroke={2.25} />
      </span>
    );
  }
  if (active) {
    return (
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--accent-border-blue)]",
          twinAccent.text,
        )}
      >
        <IconLoader2 className="h-3.5 w-3.5 animate-spin" stroke={2.25} />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--mobile-app-card-border)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--graphite-muted)]" />
    </span>
  );
}
