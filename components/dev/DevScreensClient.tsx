"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DevCaptureCanvasSandbox, DEV_CAPTURE_THUMB_COUNTS } from "./DevCaptureCanvasSandbox";
import { DevNoteReviewSandbox } from "./DevNoteReviewSandbox";
import { DevTwinCaptureSandbox } from "./DevTwinCaptureSandbox";
import { DevTwinUploadSandbox } from "./DevTwinUploadSandbox";
import { DevTwinViewerSandbox } from "./DevTwinViewerSandbox";
import { DevTwinWizardSandbox } from "./DevTwinWizardSandbox";
import { DevScreenFrame, type DevDeviceMode } from "./DevScreenFrame";

const SCREENS = [
  { id: "capture", label: "Capture canvas", description: "No-plans camera canvas with mock stops." },
  { id: "note-review", label: "Note / review", description: "Field notes + primary save affordance." },
  { id: "twin-capture", label: "Twin capture", description: "Full-bleed camera, burst + video walk controls." },
  { id: "twin-wizard", label: "Twin wizard", description: "Space picker, output options, live cost calculator." },
  { id: "twin-upload", label: "Twin upload", description: "Mock review & upload progress state." },
  { id: "twin-viewer", label: "Twin viewer", description: "Splat viewer + mock queue/share state." },
] as const;

type ScreenId = (typeof SCREENS)[number]["id"];

function parseScreen(value: string | null): ScreenId | null {
  if (!value) return null;
  return SCREENS.some((entry) => entry.id === value) ? (value as ScreenId) : null;
}

function parseDevice(value: string | null): DevDeviceMode {
  return value === "desktop" ? "desktop" : "mobile";
}

export function DevScreensClient() {
  const searchParams = useSearchParams();
  const screen = parseScreen(searchParams?.get("screen") ?? null);
  const device = parseDevice(searchParams?.get("device") ?? null);
  const keyboardSim = Number.parseInt(searchParams?.get("keyboard") ?? "", 10);

  const activeMeta = useMemo(
    () => SCREENS.find((entry) => entry.id === screen) ?? null,
    [screen],
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]">
      <header className="shrink-0 border-b border-[var(--mobile-app-card-border)] px-4 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--graphite-muted)]">
          Dev screens
        </p>
        <h1 className="mt-1 text-xl font-bold text-[var(--graphite-text-header)]">UI sandbox</h1>
        <p className="mt-1 text-sm text-[var(--graphite-muted)]">
          Local-only screen previews with mock data. Not shipped to production.
        </p>
      </header>

      <div className="shrink-0 flex flex-wrap items-center gap-2 border-b border-[var(--mobile-app-card-border)] px-4 py-3">
        {SCREENS.map((entry) => {
          const active = screen === entry.id;
          return (
            <Link
              key={entry.id}
              href={`/dev/screens?screen=${entry.id}&device=${device}`}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_12%,var(--surface-zinc))] text-[var(--graphite-text-header)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)]"
              }`}
            >
              {entry.label}
            </Link>
          );
        })}

        {screen === "capture" ? (
          <>
            <span className="mx-1 h-5 w-px bg-[var(--mobile-app-card-border)]" aria-hidden />
            {DEV_CAPTURE_THUMB_COUNTS.map((count) => {
              const active = Number.parseInt(searchParams?.get("thumbs") ?? "0", 10) === count;
              return (
                <Link
                  key={count}
                  href={`/dev/screens?screen=capture&device=${device}&thumbs=${count}`}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold tabular-nums ${
                    active
                      ? "border-[var(--accent-border-green)] text-[var(--graphite-text-header)]"
                      : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
                  }`}
                >
                  {count} thumbs
                </Link>
              );
            })}
          </>
        ) : null}

        <span className="mx-1 h-5 w-px bg-[var(--mobile-app-card-border)]" aria-hidden />

        {(["mobile", "desktop"] as const).map((mode) => {
          const active = device === mode;
          const href = screen
            ? `/dev/screens?screen=${screen}&device=${mode}`
            : `/dev/screens?device=${mode}`;
          return (
            <Link
              key={mode}
              href={href}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                active
                  ? "border-[var(--accent-border-green)] text-[var(--graphite-text-header)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
              }`}
            >
              {mode}
            </Link>
          );
        })}
      </div>

      {!screen ? (
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
          {SCREENS.map((entry) => (
            <Link
              key={entry.id}
              href={`/dev/screens?screen=${entry.id}&device=${device}`}
              className="rounded-2xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-4 shadow-[var(--mobile-app-card-shadow)] transition hover:border-[var(--accent-border-green)]"
            >
              <p className="text-sm font-bold text-[var(--graphite-text-header)]">{entry.label}</p>
              <p className="mt-1 text-xs leading-snug text-[var(--graphite-muted)]">{entry.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <DevScreenFrame mode={device} title={activeMeta?.label ?? screen}>
          {screen === "capture" ? (
            <DevCaptureCanvasSandbox />
          ) : screen === "twin-capture" ? (
            <DevTwinCaptureSandbox />
          ) : screen === "twin-wizard" ? (
            <DevTwinWizardSandbox />
          ) : screen === "twin-upload" ? (
            <DevTwinUploadSandbox />
          ) : screen === "twin-viewer" ? (
            <DevTwinViewerSandbox />
          ) : (
            <DevNoteReviewSandbox keyboardSim={Number.isFinite(keyboardSim) ? keyboardSim : undefined} />
          )}
        </DevScreenFrame>
      )}
    </div>
  );
}
