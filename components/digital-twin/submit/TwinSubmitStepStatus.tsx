"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconAlertTriangle, IconCircleCheck, IconCube } from "@tabler/icons-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import { useTwinJobRealtime } from "@/hooks/useTwinJobRealtime";
import { TwinSubmitGlassCard } from "./TwinSubmitGlassCard";
import { TwinProcessingChecklist } from "./TwinProcessingChecklist";
import { twinSubmitTokens } from "./twin-submit-tokens";

type Props = {
  captureId: string | null;
  spaceId: string;
  savedForLater?: boolean;
  onGoToTwins: () => void;
};

export function TwinSubmitStepStatus({ captureId, spaceId, savedForLater, onGoToTwins }: Props) {
  const router = useRouter();
  const { job } = useTwinJobRealtime(savedForLater ? null : captureId);

  if (savedForLater) {
    return (
      <div className="space-y-4" data-twin-submit="step-status-saved">
        <TwinSubmitGlassCard>
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <IconCircleCheck className={cn("h-12 w-12", twinAccent.text)} stroke={1.75} />
            <div>
              <p className={twinSubmitTokens.headerText}>Saved to your project</p>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--graphite-muted)]">
                Your clips, photos, and any LiDAR are safe in this project&apos;s SlateDrop. Open it on your
                desktop to drag in 360, drone, GPS, or more scans — then submit when everything&apos;s in.
                Nothing is processed (and no credits are used) until you submit.
              </p>
            </div>
          </div>
        </TwinSubmitGlassCard>

        <button type="button" onClick={onGoToTwins} className={twinSubmitTokens.primaryCta}>
          Go to My Twins
        </button>
      </div>
    );
  }

  const isComplete = job?.status === "completed";
  const isFailed = job?.status === "failed";

  if (isComplete) {
    return (
      <div className="space-y-4" data-twin-submit="step-status" data-state="completed">
        <TwinSubmitGlassCard>
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div
              className={cn(
                "flex h-24 w-full items-center justify-center rounded-xl border border-[var(--accent-border-blue)]",
                "bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)]",
              )}
            >
              <IconCube className={cn("h-10 w-10", twinAccent.text)} stroke={1.5} />
            </div>
            <div>
              <p className={twinSubmitTokens.headerText}>Your twin is ready</p>
              <p className="mt-1 text-xs text-[var(--graphite-muted)]">
                Open it to explore, measure, and share.
              </p>
            </div>
          </div>
        </TwinSubmitGlassCard>

        <button
          type="button"
          onClick={() => router.push(`/digital-twin/twins/${spaceId}`)}
          className={twinSubmitTokens.primaryCta}
        >
          View in Twin 360 Studio
        </button>
        <button type="button" onClick={onGoToTwins} className={twinSubmitTokens.secondaryCta}>
          Go to My Twins
        </button>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div className="space-y-4" data-twin-submit="step-status" data-state="failed">
        <TwinSubmitGlassCard>
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <IconAlertTriangle className="h-10 w-10 text-red-300" stroke={1.75} />
            <p className={twinSubmitTokens.headerText}>Reconstruction couldn&apos;t finish</p>
            {job?.error_text ? (
              <p className="text-xs leading-relaxed text-red-200">{job.error_text}</p>
            ) : (
              <p className="text-xs text-[var(--graphite-muted)]">
                Your capture is safe. Open review to try again.
              </p>
            )}
          </div>
        </TwinSubmitGlassCard>
        <button type="button" onClick={onGoToTwins} className={twinSubmitTokens.primaryCta}>
          Go to My Twins
        </button>
      </div>
    );
  }

  // Queued or processing — staged checklist + a clear "you can leave" affordance.
  return (
    <div className="space-y-4" data-twin-submit="step-status" data-state="processing">
      <TwinSubmitGlassCard>
        <TwinProcessingChecklist stage={job?.stage ?? null} startedAt={job?.started_at ?? null} />
      </TwinSubmitGlassCard>

      <TwinSubmitGlassCard>
        <div className="flex items-start gap-3">
          <IconCircleCheck className={cn("mt-0.5 h-5 w-5 shrink-0", twinAccent.text)} stroke={1.75} />
          <p className="text-xs leading-relaxed text-[var(--graphite-text-body)]">
            You can close this — we&apos;ll notify you when it&apos;s ready. Processing keeps running in the
            cloud whether or not this screen is open.
          </p>
        </div>
      </TwinSubmitGlassCard>

      <Link
        href={`/digital-twin/twins/${spaceId}`}
        aria-disabled
        onClick={(event) => event.preventDefault()}
        className={cn(twinSubmitTokens.primaryCta, "pointer-events-none opacity-40")}
      >
        View in Twin 360 Studio
      </Link>
      <button type="button" onClick={onGoToTwins} className={twinSubmitTokens.secondaryCta}>
        Go to My Twins
      </button>
    </div>
  );
}
