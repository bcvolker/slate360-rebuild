"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import {
  MOCK_TWIN_CAPTURE_ASSETS,
  formatTwinBytes,
  labelOutputType,
  type TwinSubmissionChoices,
} from "@/lib/dev/mock-twin-capture";

type Props = {
  spaceName?: string;
  choices?: TwinSubmissionChoices;
  onComplete?: () => void;
};

const DEFAULT_CHOICES: TwinSubmissionChoices = {
  outputType: "gaussian_splat",
  quality: "standard",
  speed: "standard",
};

const UPLOAD_PHASES = [
  { label: "Packaging capture assets", weight: 22 },
  { label: "Uploading photo burst", weight: 34 },
  { label: "Uploading video walk", weight: 28 },
  { label: "Syncing sensor metadata", weight: 16 },
] as const;

export function TwinCaptureUploadState({
  spaceName = "Lobby — Level 1",
  choices = DEFAULT_CHOICES,
  onComplete,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const totalBytes = MOCK_TWIN_CAPTURE_ASSETS.reduce((sum, row) => sum + row.sizeBytes, 0);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setProgress((value) => {
        const next = Math.min(100, value + 2 + Math.random() * 4);
        if (next >= 100) {
          setDone(true);
          onComplete?.();
        }
        return next;
      });
    }, 280);
    return () => clearInterval(interval);
  }, [done, onComplete]);

  const activePhaseIndex = Math.min(
    UPLOAD_PHASES.length - 1,
    Math.floor((progress / 100) * UPLOAD_PHASES.length),
  );
  const activePhase = UPLOAD_PHASES[activePhaseIndex];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-xl border ${twinAccent.iconChip}`}
        >
          {done ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>

        <h2 className="mt-4 text-center text-lg font-black text-[var(--graphite-text-header)]">
          {done ? "Upload complete" : "Uploading capture"}
        </h2>
        <p className="mt-1 text-center text-sm text-[var(--graphite-muted)]">
          {spaceName} · {labelOutputType(choices.outputType)} · {formatTwinBytes(totalBytes)}
        </p>

        <div className="mt-6 rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-[var(--graphite-muted)]">
              {done ? "Ready for queue" : activePhase?.label}
            </span>
            <span className={twinAccent.text}>{Math.round(progress)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--surface-zinc-border)_60%,transparent)]">
            <div
              className="h-full rounded-xl bg-[var(--twin360-blue)] transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {!done && (
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--graphite-muted)]">
              <Loader2 className={`h-3.5 w-3.5 animate-spin ${twinAccent.spinner}`} />
              Mock upload — no network calls
            </p>
          )}
        </div>

        <ul className="mt-4 space-y-2 text-xs">
          {UPLOAD_PHASES.map((phase, index) => {
            const complete = done || index < activePhaseIndex;
            const active = !done && index === activePhaseIndex;
            return (
              <li
                key={phase.label}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                  active
                    ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_8%,transparent)]"
                    : "border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)]"
                }`}
              >
                <span
                  className={
                    complete || active
                      ? "font-semibold text-[var(--graphite-text-header)]"
                      : "text-[var(--graphite-muted)]"
                  }
                >
                  {phase.label}
                </span>
                {complete ? (
                  <CheckCircle2 className={`h-4 w-4 ${twinAccent.text}`} />
                ) : active ? (
                  <Loader2 className={`h-4 w-4 animate-spin ${twinAccent.spinner}`} />
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
