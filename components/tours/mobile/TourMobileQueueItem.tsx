"use client";

import type { QueueEntry } from "@/components/tours/mobile/TourMobileImportShell";

function badgeCopy(entry: QueueEntry): { label: string; tone: "ok" | "warn" | "pending" } {
  if (entry.status === "detecting") return { label: "Checking…", tone: "pending" };
  if (!entry.detection) return { label: "Pending", tone: "pending" };
  if (entry.detection.isRejectedRawFormat) return { label: "Raw file — not supported", tone: "warn" };
  if (entry.detection.looksLikeEquirect) {
    return {
      label: entry.detection.hasGPanoMetadata ? "Verified 360°" : "Looks like 360°",
      tone: "ok",
    };
  }
  return { label: "Not a 360° photo", tone: "warn" };
}

export function TourMobileQueueItem({ entry, onRemove }: { entry: QueueEntry; onRemove: () => void }) {
  const badge = badgeCopy(entry);
  // Warnings stay muted-graphite (not a bright/alarm color) — "doesn't look like a
  // 360° photo" is a heads-up the user can still act on, not a hard failure. Actual
  // upload failures below use a distinct red, since those are unrecoverable without
  // retrying.
  const toneClass =
    badge.tone === "ok"
      ? "text-[var(--graphite-primary)]"
      : badge.tone === "warn"
        ? "font-semibold text-[var(--graphite-muted)] underline decoration-dotted"
        : "text-[var(--graphite-muted)]";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2">
      <img
        src={entry.previewUrl}
        alt=""
        className="h-14 w-14 flex-shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{entry.file.name}</div>
        <div className={`font-mono text-[10px] uppercase tracking-wide ${toneClass}`}>{badge.label}</div>
        {entry.detection && entry.detection.width > 0 && (
          <div className="font-mono text-[10px] text-[var(--graphite-muted)]">
            {entry.detection.width}×{entry.detection.height}
          </div>
        )}
        {(entry.status === "uploading" || entry.status === "done") && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-sm bg-white/10">
            <div
              className="h-full rounded-sm bg-[var(--graphite-primary)] transition-all"
              style={{ width: `${entry.percent}%` }}
            />
          </div>
        )}
        {entry.status === "error" && <div className="text-[10px] text-red-400">{entry.error}</div>}
      </div>
      {entry.status === "queued" && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 font-mono text-xs text-[var(--graphite-muted)]"
          aria-label={`Remove ${entry.file.name}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}
