"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flashlight, FlashlightOff, FlipHorizontal } from "lucide-react";
import { buildCaptureSummaryUrl } from "@/lib/site-walk/capture-v2-config";
import { CAPTURE_V2_LAYERS } from "./layers";

type Props = {
  sessionId: string;
  contextLabel: string;
  stopCount: number;
  collapsed: boolean;
  flashOn: boolean;
  onToggleFlash: () => void;
  onFlipCamera?: () => void;
  showFlip?: boolean;
};

export function CaptureCanvasTopBar({
  sessionId,
  contextLabel,
  stopCount,
  collapsed,
  flashOn,
  onToggleFlash,
  onFlipCamera,
  showFlip = false,
}: Props) {
  const router = useRouter();
  const reviewHref = buildCaptureSummaryUrl(sessionId);

  if (collapsed) {
    return (
      <div
        className={`${CAPTURE_V2_LAYERS.taskHeader} pointer-events-none absolute inset-x-0 top-0 z-30 h-10`}
        aria-hidden
      />
    );
  }

  return (
    <header
      className={`${CAPTURE_V2_LAYERS.taskHeader} absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)]`}
    >
      <button
        type="button"
        onClick={() => router.push("/site-walk")}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md transition active:scale-[0.98]"
        aria-label="Back to Site Walk home"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <Link
        href={reviewHref}
        className="min-w-0 flex-1 rounded-full border border-[var(--mobile-app-card-border-primary)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-3 py-2 text-center backdrop-blur-md transition hover:border-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)] active:scale-[0.99]"
      >
        <span className="block truncate text-xs font-bold text-[var(--graphite-text-header)]">
          {contextLabel}
        </span>
        <span className="block text-[10px] font-semibold text-[var(--graphite-primary)]">
          {stopCount} {stopCount === 1 ? "stop" : "stops"} · Review
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        {showFlip && onFlipCamera ? (
          <button
            type="button"
            onClick={onFlipCamera}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md transition active:scale-[0.98]"
            aria-label="Flip camera"
          >
            <FlipHorizontal className="h-5 w-5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggleFlash}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] text-[var(--graphite-text-header)] backdrop-blur-md transition active:scale-[0.98]"
          aria-label={flashOn ? "Flash on (stub)" : "Flash off (stub)"}
          aria-pressed={flashOn}
        >
          {flashOn ? (
            <Flashlight className="h-5 w-5 text-[var(--graphite-primary)]" />
          ) : (
            <FlashlightOff className="h-5 w-5" />
          )}
        </button>
      </div>
    </header>
  );
}
