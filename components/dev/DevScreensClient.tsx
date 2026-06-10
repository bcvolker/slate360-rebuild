"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DevCaptureCanvasSandbox, DEV_CAPTURE_THUMB_COUNTS } from "./DevCaptureCanvasSandbox";
import { DevNoteReviewSandbox } from "./DevNoteReviewSandbox";
import { DevWalkReviewSandbox } from "./DevWalkReviewSandbox";
import { DEV_WALK_REVIEW_STOP_COUNTS } from "@/lib/dev/mock-walk-review";
import { DevTwinCaptureSandbox, DEV_TWIN_CLIP_COUNTS } from "./DevTwinCaptureSandbox";
import { DevTwinReviewSandbox } from "./DevTwinReviewSandbox";
import { DevTwinUploadSandbox } from "./DevTwinUploadSandbox";
import { DevTwinViewerSandbox } from "./DevTwinViewerSandbox";
import { DevTwinWizardSandbox } from "./DevTwinWizardSandbox";
import { DevScreenFrame, type DevDeviceMode } from "./DevScreenFrame";

const SCREENS = [
  { id: "capture", label: "Capture canvas", description: "No-plans camera canvas with mock stops." },
  { id: "walk-review", label: "Walk review", description: "End-of-walk stop grid with pinned actions." },
  { id: "note-review", label: "Note / review", description: "Field notes + primary save affordance." },
  { id: "twin-capture", label: "Twin capture", description: "Full-bleed camera, burst + video walk controls." },
  { id: "twin-review", label: "Twin review", description: "Post-capture review, estimate, and create twin." },
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

function parseFrameSize(searchParams: URLSearchParams | null) {
  const width = Number.parseInt(searchParams?.get("frameW") ?? "", 10);
  const height = Number.parseInt(searchParams?.get("frameH") ?? "", 10);
  return {
    frameWidth: Number.isFinite(width) && width > 0 ? width : undefined,
    frameHeight: Number.isFinite(height) && height > 0 ? height : undefined,
  };
}

function twinCaptureHref(device: DevDeviceMode, searchParams: URLSearchParams | null, patch: Record<string, string>) {
  const params = new URLSearchParams();
  params.set("screen", "twin-capture");
  params.set("device", device);
  params.set("clips", searchParams?.get("clips") ?? "0");
  params.set("mode", searchParams?.get("mode") ?? "video");
  for (const [key, value] of Object.entries(patch)) params.set(key, value);
  return `/dev/screens?${params.toString()}`;
}

export function DevScreensClient() {
  const searchParams = useSearchParams();
  const screen = parseScreen(searchParams?.get("screen") ?? null);
  const device = parseDevice(searchParams?.get("device") ?? null);
  const keyboardSim = Number.parseInt(searchParams?.get("keyboard") ?? "", 10);
  const { frameWidth, frameHeight } = parseFrameSize(searchParams);

  const activeMeta = useMemo(
    () => SCREENS.find((entry) => entry.id === screen) ?? null,
    [screen],
  );

  const sandbox = (() => {
    switch (screen) {
      case "capture":
        return <DevCaptureCanvasSandbox />;
      case "walk-review":
        return <DevWalkReviewSandbox />;
      case "note-review":
        return <DevNoteReviewSandbox keyboardSim={Number.isFinite(keyboardSim) ? keyboardSim : undefined} />;
      case "twin-capture":
        return <DevTwinCaptureSandbox />;
      case "twin-review":
        return <DevTwinReviewSandbox />;
      case "twin-wizard":
        return <DevTwinWizardSandbox />;
      case "twin-upload":
        return <DevTwinUploadSandbox />;
      case "twin-viewer":
        return <DevTwinViewerSandbox />;
      default:
        return null;
    }
  })();

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

        {screen === "walk-review" ? (
          <>
            <span className="mx-1 h-5 w-px bg-[var(--mobile-app-card-border)]" aria-hidden />
            {DEV_WALK_REVIEW_STOP_COUNTS.map((count) => {
              const active = Number.parseInt(searchParams?.get("stops") ?? "8", 10) === count;
              const variant = searchParams?.get("variant") ?? "quick";
              return (
                <Link
                  key={count}
                  href={`/dev/screens?screen=walk-review&device=${device}&frameW=390&frameH=844&stops=${count}&variant=${variant}`}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold tabular-nums ${
                    active
                      ? "border-[var(--accent-border-green)] text-[var(--graphite-text-header)]"
                      : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
                  }`}
                >
                  {count} stops
                </Link>
              );
            })}
            {(["quick", "project"] as const).map((variant) => {
              const active = (searchParams?.get("variant") ?? "quick") === variant;
              const stops = searchParams?.get("stops") ?? "8";
              return (
                <Link
                  key={variant}
                  href={`/dev/screens?screen=walk-review&device=${device}&frameW=390&frameH=844&stops=${stops}&variant=${variant}`}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase ${
                    active
                      ? "border-[var(--accent-border-green)] text-[var(--graphite-text-header)]"
                      : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
                  }`}
                >
                  {variant}
                </Link>
              );
            })}
          </>
        ) : null}

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

        {screen === "twin-capture" ? (
          <>
            <span className="mx-1 h-5 w-px bg-[var(--mobile-app-card-border)]" aria-hidden />
            {DEV_TWIN_CLIP_COUNTS.map((count) => {
              const active = Number.parseInt(searchParams?.get("clips") ?? "0", 10) === count;
              return (
                <Link
                  key={count}
                  href={twinCaptureHref(device, searchParams, { clips: String(count) })}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold tabular-nums ${
                    active
                      ? "border-[var(--accent-border-green)] text-[var(--graphite-text-header)]"
                      : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
                  }`}
                >
                  {count} clips
                </Link>
              );
            })}
            {(["video", "photos"] as const).map((mode) => {
              const active = (searchParams?.get("mode") ?? "video") === mode;
              return (
                <Link
                  key={mode}
                  href={twinCaptureHref(device, searchParams, { mode })}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase ${
                    active
                      ? "border-[var(--accent-border-green)] text-[var(--graphite-text-header)]"
                      : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
                  }`}
                >
                  {mode}
                </Link>
              );
            })}
          </>
        ) : null}

        {screen === "twin-review" ? (
          <>
            <span className="mx-1 h-5 w-px bg-[var(--mobile-app-card-border)]" aria-hidden />
            <Link
              href={`/dev/screens?screen=twin-review&device=${device}&credits=low&sheet=open`}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                searchParams?.get("credits") === "low"
                  ? "border-[var(--accent-border-green)] text-[var(--graphite-text-header)]"
                  : "border-[var(--mobile-app-card-border)] text-[var(--graphite-muted)]"
              }`}
            >
              low credits
            </Link>
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
        <DevScreenFrame
          mode={device}
          title={activeMeta?.label ?? screen}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
        >
          {sandbox}
        </DevScreenFrame>
      )}
    </div>
  );
}
