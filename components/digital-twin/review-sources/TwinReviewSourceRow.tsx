"use client";

import { useEffect, useState } from "react";
import { Box, FileText, Image as ImageIcon, LockKeyhole, Video, X } from "lucide-react";
import {
  chipLabel,
  TWIN_SOURCE_CHIPS,
  type TwinSourceChip,
} from "@/lib/digital-twin/twin-source-chip";
import type { TwinReviewSource } from "@/lib/digital-twin/review-source-types";

type Props = {
  source: TwinReviewSource;
  onChipChange: (chip: TwinSourceChip) => void;
  onRemove?: () => void;
  disabled?: boolean;
};

export function TwinReviewSourceRow({ source, onChipChange, onRemove, disabled = false }: Props) {
  const [previewUrl, setPreviewUrl] = useState(source.thumbnailUrl ?? null);
  const isImage = source.contentType.startsWith("image/");
  const isVideo =
    source.contentType.startsWith("video/") ||
    /\.(mp4|mov|m4v|webm|insv)$/i.test(source.name);

  useEffect(() => {
    if (source.thumbnailUrl || !source.file || (!isImage && !isVideo)) {
      setPreviewUrl(source.thumbnailUrl ?? null);
      return;
    }
    const url = URL.createObjectURL(source.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [isImage, isVideo, source.file, source.thumbnailUrl]);

  return (
    <li className="border-b border-white/10 py-4 last:border-b-0" data-twin-review-source={source.id}>
      <div className="flex min-w-0 items-start gap-3">
        <SourcePreview source={source} previewUrl={previewUrl} isImage={isImage} isVideo={isVideo} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--graphite-text-header)]">{source.name}</p>
              <p className="mt-1 text-xs text-[var(--graphite-muted)]">
                {formatBytes(source.sizeBytes)} · {statusLabel(source)}
              </p>
            </div>
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[var(--graphite-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--graphite-text-header)] disabled:opacity-40"
                aria-label={`Remove ${source.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2" aria-label={`Source type for ${source.name}`}>
            {TWIN_SOURCE_CHIPS.map((chip) => {
              const available = source.chipOptions.includes(chip);
              const active = source.chip === chip;
              const measured360 =
                source.projection === "equirect" || source.projection === "dual_fisheye";
              return (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled || !available || (measured360 && chip !== "360")}
                  onClick={() => onChipChange(chip)}
                  className={[
                    "min-h-12 rounded-xl border px-3 text-xs font-semibold transition-colors",
                    active
                      ? "border-[var(--twin360-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] text-[var(--graphite-text-header)]"
                      : "border-white/10 bg-white/[0.02] text-[var(--graphite-muted)]",
                    !available && "cursor-not-allowed opacity-35",
                    disabled && "cursor-not-allowed opacity-50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {chipLabel(chip)}
                </button>
              );
            })}
          </div>
          {source.projection === "equirect" || source.projection === "dual_fisheye" ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[var(--graphite-muted)]">
              <LockKeyhole className="h-3 w-3" />
              360 detected from the file
            </p>
          ) : null}
          {source.uploadProgress !== undefined && source.status === "uploading" ? (
            <div className="mt-3" aria-label={`Adding ${source.name}`}>
              <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--graphite-muted)]">
                <span>Adding source</span>
                <span className="tabular-nums">{source.uploadProgress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-xl bg-white/[0.08]">
                <div
                  className="h-full bg-[var(--twin360-blue)] transition-[width] duration-300"
                  style={{ width: `${source.uploadProgress}%` }}
                />
              </div>
            </div>
          ) : null}
          {source.error ? <p className="mt-2 text-xs text-red-300">{source.error}</p> : null}
        </div>
      </div>
    </li>
  );
}

function SourcePreview({
  source,
  previewUrl,
  isImage,
  isVideo,
}: {
  source: TwinReviewSource;
  previewUrl: string | null;
  isImage: boolean;
  isVideo: boolean;
}) {
  if (previewUrl && isImage) {
    return <img src={previewUrl} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />;
  }
  const Icon = isVideo ? Video : source.assetKind.includes("lidar") ? Box : isImage ? ImageIcon : FileText;
  return (
    <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
      <Icon className="h-6 w-6 text-[var(--graphite-muted)]" aria-hidden="true" />
    </div>
  );
}

function statusLabel(source: TwinReviewSource): string {
  if (source.status === "uploading") return "Adding";
  if (source.status === "pending") return "Ready to add";
  if (source.status === "error") return "Needs another try";
  if (source.origin === "capture") return "Collected";
  return "Ready";
}

function formatBytes(bytes: number): string {
  if (!bytes) return "Size unavailable";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
