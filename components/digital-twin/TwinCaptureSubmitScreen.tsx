"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconLoader2, IconCheck, IconCircleDashed } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { useTwinCreditEstimate } from "@/hooks/useTwinCreditEstimate";
import { TwinJobStatus } from "./TwinJobStatus";

export type TwinSubmitAsset = {
  assetKind: string;
  fileSizeBytes: number;
  status: string;
  contentType: string | null;
};

type Props = {
  captureId: string;
  spaceId: string;
  captureStatus: string;
  title: string;
  assets: TwinSubmitAsset[];
  canUseHighQuality: boolean;
};

const ASSET_LABELS: Record<string, string> = {
  video: "Walkthrough video",
  ply_lidar: "LiDAR point cloud",
  lidar_poses: "Camera poses",
  lidar_mesh: "LiDAR mesh",
  panorama_360: "360° panorama",
  photo: "Photo",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The post-capture funnel: scan ready → cost + time → Process → live status → view/share.
 * Loaded by captureId so it works after the native upload regardless of in-memory web state.
 */
export function TwinCaptureSubmitScreen({
  captureId,
  spaceId,
  captureStatus,
  title,
  assets,
  canUseHighQuality,
}: Props) {
  const [queued, setQueued] = useState(captureStatus !== "uploaded" && captureStatus !== "draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assetsReady = assets.length > 0 && assets.every((a) => a.status === "ready");
  const { estimate, loading: estimateLoading } = useTwinCreditEstimate(captureId, assetsReady);

  const sufficient = estimate?.sufficient ?? false;
  const canProcess = assetsReady && sufficient && !busy && !queued;

  const totalBytes = useMemo(
    () => assets.reduce((sum, a) => sum + (a.fileSizeBytes || 0), 0),
    [assets],
  );

  async function handleProcess() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-twin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capture_id: captureId, output_format: "spz", quality: "standard" }),
      });
      const data = (await res.json().catch(() => ({}))) as { job?: { id: string }; error?: string };
      if (!res.ok || !data.job?.id) throw new Error(data.error ?? "Could not start processing");
      setQueued(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start processing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-zinc-100">Scan ready</h1>
          <p className="text-sm text-zinc-400">{title}</p>
        </header>

        {/* Asset checklist */}
        <section className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Captured assets
          </h2>
          <ul className="flex flex-col gap-1.5">
            {assets.map((a, i) => {
              const ready = a.status === "ready";
              return (
                <li key={`${a.assetKind}-${i}`} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-zinc-300">
                    {ready ? (
                      <IconCheck className={cn("h-4 w-4", twinAccent.text)} />
                    ) : (
                      <IconCircleDashed className="h-4 w-4 animate-spin text-zinc-500" />
                    )}
                    {ASSET_LABELS[a.assetKind] ?? a.assetKind}
                  </span>
                  <span className={twinAccent.textMuted}>{formatBytes(a.fileSizeBytes)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-xs text-zinc-500">Total {formatBytes(totalBytes)}</p>
          {/* Other sensors / cameras can be attached to this same capture before processing. */}
          <Link
            href={`/digital-twin/upload?capture=${encodeURIComponent(captureId)}`}
            className={cn("mt-1 text-xs", twinAccent.link)}
          >
            + Add files from other cameras or sensors
          </Link>
        </section>

        {/* Cost + process / status */}
        {!queued ? (
          <section className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
            {!assetsReady ? (
              <p className="inline-flex items-center gap-2 text-sm text-zinc-400">
                <IconLoader2 className={cn("h-4 w-4 animate-spin", twinAccent.spinner)} />
                Finishing upload…
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">Processing cost</span>
                  <span className={cn("font-semibold", twinAccent.text)}>
                    {estimateLoading || !estimate
                      ? "…"
                      : `${estimate.creditsRequired} credit${estimate.creditsRequired === 1 ? "" : "s"}`}
                  </span>
                </div>
                {estimate ? (
                  <p className="text-xs text-zinc-500">
                    Balance: {estimate.creditsBalance} · A draft preview is generated first, usually
                    within a few minutes.
                  </p>
                ) : null}

                {estimate && !sufficient ? (
                  <p className="text-xs text-amber-300/90">
                    Not enough credits to process this scan.
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleProcess()}
                  disabled={!canProcess}
                  className={cn(twinAccent.button, "w-full min-h-[44px] text-sm")}
                >
                  {busy ? "Starting…" : "Process into 3D model"}
                </button>
                {error ? <p className="text-xs text-red-300">{error}</p> : null}
              </>
            )}
          </section>
        ) : (
          <section className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
            <h2 className="text-sm font-semibold text-zinc-100">Building your 3D twin</h2>
            <TwinJobStatus captureId={captureId} spaceId={spaceId} />
          </section>
        )}

        <Link href="/digital-twin" className="text-center text-xs text-zinc-500 hover:text-zinc-300">
          Back to My Twins
        </Link>
      </div>
    </div>
  );
}
