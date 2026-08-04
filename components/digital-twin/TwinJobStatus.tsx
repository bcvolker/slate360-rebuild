"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconAlertTriangle, IconBox, IconLoader2 } from "@tabler/icons-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";
import { useTwinJobRealtime } from "@/hooks/useTwinJobRealtime";

type Props = {
  captureId: string | null;
  spaceId: string;
  className?: string;
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function TwinJobStatus({ captureId, spaceId, className }: Props) {
  const router = useRouter();
  const { job, connected } = useTwinJobRealtime(captureId);

  if (!captureId) return null;

  const progress = typeof job?.progress_pct === "number" ? job.progress_pct : 0;
  const isActive = job?.status === "queued" || job?.status === "processing";
  const isComplete = job?.status === "completed";
  const isFailed = job?.status === "failed";

  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.03] p-3",
        isFailed && "border-red-500/20 bg-red-500/[0.04]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            isFailed ? "border-red-500/25 bg-red-500/10 text-red-200" : twinAccent.iconChip,
          )}
        >
          {isFailed ? (
            <IconAlertTriangle className="h-4 w-4" stroke={1.75} />
          ) : isActive ? (
            <IconLoader2 className={cn("h-4 w-4 animate-spin", twinAccent.spinner)} />
          ) : (
            <IconBox className="h-4 w-4" stroke={1.75} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-zinc-200">
            {job ? statusLabel(job.status) : "Awaiting job status"}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {connected ? "Live updates" : "Connecting…"}
            {job?.output_format ? ` · ${job.output_format.toUpperCase()}` : ""}
          </p>
          {isActive ? (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[10px] font-semibold text-zinc-400">
                <span>Processing</span>
                <span className={twinAccent.text}>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-xl bg-white/[0.06]">
                <div
                  className="h-full rounded-xl bg-[var(--twin360-blue)] transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
          {isFailed && job?.error_text ? (
            <p className="mt-2 text-xs leading-relaxed text-red-200">{job.error_text}</p>
          ) : null}
        </div>
      </div>

      {isComplete ? (
        <Link
          href={`/digital-twin/twins/${spaceId}`}
          onClick={(event) => {
            event.preventDefault();
            router.push(`/digital-twin/twins/${spaceId}`);
          }}
          className={cn(twinAccent.button, "mt-3 inline-flex w-full min-h-[44px] items-center justify-center")}
        >
          View model
        </Link>
      ) : null}
    </div>
  );
}
