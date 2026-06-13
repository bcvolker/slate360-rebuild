"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import { useTwinJobRealtime } from "@/hooks/useTwinJobRealtime";
import { TwinSubmitGlassCard } from "./TwinSubmitGlassCard";
import { twinSubmitTokens } from "./twin-submit-tokens";

type Props = {
  captureId: string | null;
  spaceId: string;
  onGoToTwins: () => void;
};

function statusDisplay(status: string | undefined, progress: number): string {
  if (!status) return "Queued";
  if (status === "processing") return `Processing (${progress}%)`;
  if (status === "completed") return "Complete";
  if (status === "failed") return "Failed";
  if (status === "queued") return "Queued";
  return status.replace(/_/g, " ");
}

export function TwinSubmitStepStatus({ captureId, spaceId, onGoToTwins }: Props) {
  const router = useRouter();
  const { job, connected } = useTwinJobRealtime(captureId);

  const progress = typeof job?.progress_pct === "number" ? job.progress_pct : 0;
  const isActive = job?.status === "queued" || job?.status === "processing";
  const isComplete = job?.status === "completed";
  const isFailed = job?.status === "failed";
  const ringProgress = isComplete ? 100 : isActive ? Math.max(progress, 8) : 0;

  return (
    <div className="space-y-4" data-twin-submit="step-status">
      <TwinSubmitGlassCard>
        <div className="flex flex-col items-center gap-4 py-2">
          <ProgressRing progress={ringProgress} failed={isFailed} />
          <div className="text-center">
            <p className={twinSubmitTokens.headerText}>{statusDisplay(job?.status, progress)}</p>
            <p className="mt-1 text-[11px] text-[var(--graphite-muted)]">
              {connected ? "Live updates" : "Connecting…"}
            </p>
          </div>
        </div>

        {isFailed && job?.error_text ? (
          <p className="mt-3 text-xs leading-relaxed text-red-200">{job.error_text}</p>
        ) : null}
      </TwinSubmitGlassCard>

      <Link
        href={`/digital-twin/twins/${spaceId}`}
        onClick={(event) => {
          if (!isComplete) {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          router.push(`/digital-twin/twins/${spaceId}`);
        }}
        aria-disabled={!isComplete}
        className={cn(
          twinSubmitTokens.primaryCta,
          !isComplete && "pointer-events-none opacity-40",
        )}
      >
        View in Twin 360 Studio
      </Link>

      <button type="button" onClick={onGoToTwins} className={twinSubmitTokens.secondaryCta}>
        Go to My Twins
      </button>
    </div>
  );
}

function ProgressRing({ progress, failed }: { progress: number; failed: boolean }) {
  const size = 88;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--mobile-app-card-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={failed ? "#f87171" : "var(--twin360-blue)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          failed ? "text-red-200" : twinAccent.text,
        )}
      >
        {failed ? (
          <IconAlertTriangle className="h-6 w-6" stroke={1.75} />
        ) : progress > 0 && progress < 100 ? (
          <span className="text-sm font-bold">{progress}%</span>
        ) : progress >= 100 ? (
          <span className="text-sm font-bold">✓</span>
        ) : (
          <IconLoader2 className={cn("h-6 w-6 animate-spin", twinAccent.spinner)} />
        )}
      </span>
    </div>
  );
}
