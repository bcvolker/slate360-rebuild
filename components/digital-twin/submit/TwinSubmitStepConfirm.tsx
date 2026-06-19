"use client";

import { useState } from "react";
import type { TwinJobCreditEstimate, TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";
import { formatTwinReviewDuration, formatTwinReviewMinutes } from "@/lib/digital-twin/twin-review-format";
import type { TwinCaptureClipReview, TwinReviewAddedSource } from "@/lib/digital-twin/twin-capture-pending-session";
import { classifyTwinMedia, isTwinScanCategory } from "@/lib/digital-twin/twin-review-media";
import { cn } from "@/lib/utils";
import { TwinSubmitGlassCard } from "./TwinSubmitGlassCard";
import { twinSubmitTokens } from "./twin-submit-tokens";

type Props = {
  scanName: string;
  clips: TwinCaptureClipReview[];
  addedSources: TwinReviewAddedSource[];
  quality: TwinProcessingQuality;
  estimate: TwinJobCreditEstimate | null;
  totalDurationSeconds: number;
  submitting: boolean;
  uploadProgress: number | null;
  baseCredits: number;
  addedCredits: number;
  retainRaw: boolean;
  onRetainRawChange: (value: boolean) => void;
  onScanNameChange: (value: string) => void;
  onSubmit: () => void;
  onSaveForLater: () => void;
};

function sourceFile(source: TwinReviewAddedSource): File {
  return source.origin === "slatedrop"
    ? new File([], source.pickerFile.name, { type: source.pickerFile.type || "application/octet-stream" })
    : source.file;
}

export function TwinSubmitStepConfirm({
  scanName,
  clips,
  addedSources,
  quality,
  estimate,
  totalDurationSeconds,
  submitting,
  uploadProgress,
  baseCredits,
  addedCredits,
  retainRaw,
  onRetainRawChange,
  onScanNameChange,
  onSubmit,
  onSaveForLater,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const credits = estimate?.creditsRequired ?? 0;
  const canSubmit = confirmed && !submitting && Boolean(estimate);
  const scanCount = addedSources.filter((s) => isTwinScanCategory(classifyTwinMedia(sourceFile(s)))).length;

  return (
    <div className="space-y-4" data-twin-submit="step-confirm">
      <TwinSubmitGlassCard title="Summary">
        <label className="mb-3 block space-y-1">
          <span className={twinSubmitTokens.sectionLabel}>Scan name</span>
          <input
            type="text"
            value={scanName}
            onChange={(event) => onScanNameChange(event.target.value)}
            className="w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 py-2.5 text-sm text-[var(--graphite-text-header)] outline-none focus:border-[var(--accent-border-blue)]"
          />
        </label>

        <SummaryRow label="Primary clips" value={`${clips.length}`} />
        <SummaryRow label="Supporting assets" value={`${addedSources.length}`} />
        {scanCount > 0 ? (
          <SummaryRow label="LiDAR / 3D scans" value={`${scanCount}`} />
        ) : null}
        <SummaryRow label="Capture duration" value={formatTwinReviewDuration(totalDurationSeconds)} />
        <SummaryRow label="Quality" value={quality === "high" ? "High" : "Standard"} />
        <div className="my-2 h-px bg-[var(--mobile-app-card-border)]" />
        <SummaryRow
          label="Credit cost"
          value={estimate ? `${estimate.creditsRequired} credits` : "Calculating…"}
        />
        <SummaryRow
          label="Estimated time"
          value={estimate ? formatTwinReviewMinutes(estimate.estimatedMinutes ?? 1) : "—"}
        />
      </TwinSubmitGlassCard>

      <label className="flex items-start gap-2.5 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] px-3 py-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--twin360-blue)]"
        />
        <span className="text-xs leading-snug text-[var(--graphite-text-body)]">
          I confirm this job will consume {credits || "the estimated"} credits from my balance.
        </span>
      </label>

      <TwinSubmitGlassCard title="Token estimate">
        <SummaryRow label="Base capture" value={`${baseCredits} credits`} />
        <SummaryRow
          label="Added sources"
          value={addedCredits > 0 ? `+${addedCredits} credits` : "—"}
        />
        <div className="my-2 h-px bg-[var(--mobile-app-card-border)]" />
        <SummaryRow
          label="Total to submit"
          value={estimate ? `${estimate.creditsRequired} credits` : "Calculating…"}
        />
        {addedCredits > 0 ? (
          <p className="mt-2 text-[11px] leading-snug text-[var(--graphite-muted)]">
            Your added sources increase the cost by {addedCredits} credits and may lengthen processing time —
            but generally produce a richer, more accurate model.
          </p>
        ) : null}
      </TwinSubmitGlassCard>

      <TwinSubmitGlassCard title="Raw source files">
        <p className="mb-3 text-[11px] leading-snug text-[var(--graphite-muted)]">
          Your raw clips, photos{scanCount > 0 ? ", and scans" : ""} can stay in this project&apos;s SlateDrop so
          you can reuse them for another model later — or be removed after processing to save storage.
        </p>
        <div className="space-y-2">
          <RetainOption
            selected={retainRaw}
            onSelect={() => onRetainRawChange(true)}
            title="Keep raw files in this project"
            body="Stored in SlateDrop. Reuse them later without re-uploading."
          />
          <RetainOption
            selected={!retainRaw}
            onSelect={() => onRetainRawChange(false)}
            title="Don't keep — free up storage"
            body="Raw files are removed once the model is built. You keep the finished twin."
          />
        </div>
      </TwinSubmitGlassCard>

      {uploadProgress !== null ? (
        <p className="text-xs text-[var(--graphite-muted)]">Uploading… {uploadProgress}%</p>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={onSubmit}
        className={twinSubmitTokens.primaryCta}
      >
        {submitting ? "Submitting…" : "Submit for Processing"}
      </button>

      <button
        type="button"
        disabled={submitting}
        onClick={onSaveForLater}
        className={twinSubmitTokens.secondaryCta}
      >
        Save &amp; finish later
      </button>
      <p className="text-center text-[11px] leading-snug text-[var(--graphite-muted)]">
        Saving keeps your clips, photos{scanCount > 0 ? ", and LiDAR" : ""} in this project. Add 360, drone, GPS,
        or more scans from your desktop, then submit when everything&apos;s in.
      </p>
    </div>
  );
}

function RetainOption({
  selected,
  onSelect,
  title,
  body,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)]"
          : "border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border",
          selected ? "border-[var(--twin360-blue)]" : "border-[var(--graphite-muted)]",
        )}
      >
        {selected ? <span className="h-2 w-2 rounded-sm bg-[var(--twin360-blue)]" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[var(--graphite-text-header)]">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[var(--graphite-muted)]">{body}</span>
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-xs">
      <span className="text-[var(--graphite-muted)]">{label}</span>
      <span className="font-semibold text-[var(--graphite-text-body)]">{value}</span>
    </div>
  );
}
