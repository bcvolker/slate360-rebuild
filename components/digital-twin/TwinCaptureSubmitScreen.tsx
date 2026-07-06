"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronLeft,
  IconChevronDown,
  IconReload,
  IconPlus,
  IconCheck,
  IconLoader2,
  IconCoins,
  IconClock,
  IconCube,
  IconCircleCheck,
  IconAlertTriangle,
  IconEye,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useTwinCreditEstimate } from "@/hooks/useTwinCreditEstimate";
import { useTwinJobRealtime } from "@/hooks/useTwinJobRealtime";
import { TwinCaptureCreditsSheet } from "./TwinCaptureCreditsSheet";
import { TwinShareActions } from "./TwinShareActions";

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
  createdAt?: string | null;
  assets: TwinSubmitAsset[];
  canUseHighQuality: boolean;
};

type Quality = "standard" | "high";

const BLUE = "var(--twin360-blue)";

const ASSET_LABELS: Record<string, string> = {
  video: "Walkthrough video",
  ply_lidar: "LiDAR point cloud",
  lidar_poses: "Camera poses",
  lidar_mesh: "LiDAR mesh",
  panorama_360: "360° panorama",
  photo: "Photo",
};

const QUALITY_TIERS: { id: Quality; label: string; time: string; sub: string; gated?: boolean }[] = [
  { id: "standard", label: "Standard", time: "~12 min", sub: "Best for site walks" },
  { id: "high", label: "High", time: "~25 min", sub: "Maximum detail", gated: true },
];

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Post-capture "Scan ready" funnel, redesigned as a capture→twin checkout:
 * hero → build actions → quality → cost/time → assets → sticky process dock.
 * Loaded by captureId so it survives a fresh WebView load (native upload hands off here).
 */
export function TwinCaptureSubmitScreen({
  captureId,
  spaceId,
  captureStatus,
  title,
  createdAt,
  assets,
  canUseHighQuality,
}: Props) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [quality, setQuality] = useState<Quality>("standard");
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);

  const { job } = useTwinJobRealtime(captureId);
  const assetsReady = assets.length > 0 && assets.every((a) => a.status === "ready");
  const { estimate } = useTwinCreditEstimate(captureId, assetsReady);

  const credits = estimate?.creditsRequired ?? 0;
  const balance = estimate?.creditsBalance ?? 0;
  const sufficient = estimate?.sufficient ?? false;
  const totalBytes = useMemo(
    () => assets.reduce((s, a) => s + (a.fileSizeBytes || 0), 0),
    [assets],
  );
  const eta = QUALITY_TIERS.find((t) => t.id === quality)?.time ?? "~12 min";

  async function handleProcess() {
    if (!sufficient) {
      setCreditsOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-twin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capture_id: captureId, output_format: "spz", quality }),
      });
      const data = (await res.json().catch(() => ({}))) as { job?: { id: string }; error?: string };
      if (!res.ok || !data.job?.id) throw new Error(data.error ?? "Could not start processing");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start processing");
    } finally {
      setBusy(false);
    }
  }

  // ── Phase derivation (drives processing / complete / failed views) ─────────
  const live = job?.status;
  const phase: "ready" | "processing" | "complete" | "failed" =
    live === "completed" || captureStatus === "ready" || captureStatus === "processed"
      ? "complete"
      : live === "failed"
        ? "failed"
        : submitted || live === "processing" || live === "queued" ||
            captureStatus === "processing" || captureStatus === "queued"
          ? "processing"
          : captureStatus === "failed"
            ? "failed"
            : "ready";

  const phaseShell =
    "flex min-h-0 flex-1 flex-col bg-[var(--graphite-canvas)] px-4 pt-[calc(env(safe-area-inset-top,0px)+2rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]";

  if (phase === "complete") {
    return (
      <div className={phaseShell}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${BLUE} 18%, transparent)` }}
          >
            <IconCircleCheck className="h-9 w-9 text-[color:var(--twin360-blue)]" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-white">Your twin is ready</h1>
            <p className="text-sm text-[var(--graphite-muted)]">{title}</p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <button
              onClick={() => router.push(`/digital-twin/twins/${spaceId}`)}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-[var(--graphite-canvas)]"
              style={{ background: BLUE }}
            >
              <IconEye className="h-5 w-5" /> View 3D twin
            </button>
            <TwinShareActions spaceId={spaceId} />
            <button
              onClick={() => router.push("/digital-twin")}
              className="text-sm text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)]"
            >
              Back to My Twins
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className={phaseShell}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
            <IconAlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-white">Processing didn’t finish</h1>
            <p className="text-sm text-[var(--graphite-muted)]">
              {job?.error_text ?? "Something went wrong while building your twin."}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <button
              onClick={() => {
                setSubmitted(true);
                void handleProcess();
              }}
              className="h-[52px] w-full rounded-2xl text-[15px] font-bold text-[var(--graphite-canvas)]"
              style={{ background: BLUE }}
            >
              Try again
            </button>
            <button
              onClick={() => router.push("/digital-twin")}
              className="text-sm text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)]"
            >
              Back to My Twins
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "processing") {
    const pct = Math.max(5, job?.progress_pct ?? 5);
    const STAGES = ["Queued", "Preparing frames", "Aligning LiDAR", "Training model", "Optimizing", "Ready"];
    const stageIdx = Math.min(STAGES.length - 1, Math.floor((pct / 100) * STAGES.length));
    return (
      <div className={phaseShell}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-white">Building your 3D twin</h1>
            <p className="text-sm text-[var(--graphite-muted)]">{title}</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--graphite-text-body)]">{STAGES[stageIdx]}</span>
              <span className="font-semibold tabular-nums text-[color:var(--twin360-blue)]">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: BLUE }}
              />
            </div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                {i < stageIdx ? (
                  <IconCheck className="h-4 w-4 text-emerald-400" />
                ) : i === stageIdx ? (
                  <IconLoader2 className="h-4 w-4 animate-spin text-[color:var(--twin360-blue)]" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-white/15" />
                )}
                <span className={cn(i <= stageIdx ? "text-[var(--graphite-text-body)]" : "text-[var(--graphite-muted)]")}>{s}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--graphite-muted)]">
            This usually takes ~15–20 minutes. You can leave — processing continues in the cloud and your
            twin appears in My Twins when it’s ready.
          </p>
          <button
            onClick={() => router.push("/digital-twin")}
            className="self-start text-sm font-medium text-[color:var(--twin360-blue)]"
          >
            Go to My Twins
          </button>
        </div>
      </div>
    );
  }

  // ── Ready phase ───────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[var(--graphite-canvas)]">
      {/* scroll area (padded to clear the sticky dock) */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+150px)] pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]">
        <div className="mx-auto w-full max-w-md px-4">
          {/* top bar */}
          <div className="flex h-11 items-center justify-between">
            <button onClick={() => router.push("/digital-twin")} className="flex items-center gap-1 text-[var(--graphite-muted)]">
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--graphite-muted)]">Scan ready</span>
            <span className="w-5" />
          </div>

          {/* HERO */}
          <div className="mt-1 flex gap-3">
            <div
              className="flex h-[88px] w-[120px] shrink-0 items-center justify-center rounded-2xl"
              style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${BLUE} 22%, var(--graphite-canvas)), var(--shell-chrome-surface))` }}
            >
              <IconCube className="h-8 w-8 text-[color:var(--twin360-blue)]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <h1 className="truncate text-xl font-semibold text-white">{title}</h1>
              <p className="text-[13px] text-[var(--graphite-muted)]">
                {[formatDate(createdAt), `${assets.length} asset${assets.length === 1 ? "" : "s"}`, formatBytes(totalBytes)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {assetsReady ? (
                <span className="inline-flex w-fit items-center gap-1 text-xs font-medium text-emerald-400">
                  <IconCheck className="h-3.5 w-3.5" /> Uploaded
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-1 text-xs text-[var(--graphite-muted)]">
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> Finishing upload…
                </span>
              )}
            </div>
          </div>

          {/* ACTION RAIL */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { icon: IconReload, label: "Scan again", sub: "Add to this twin", onClick: () => router.push("/digital-twin/capture") },
              { icon: IconPlus, label: "Add sources", sub: "Drone · 360 · files", onClick: () => router.push(`/digital-twin/upload?capture=${captureId}`) },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="flex min-h-[84px] flex-col items-start justify-center gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 text-left transition-colors active:bg-white/[0.07]"
              >
                <a.icon className="h-5 w-5 text-[color:var(--twin360-blue)]" />
                <span className="text-sm font-semibold text-[var(--graphite-text-header)]">{a.label}</span>
                <span className="text-[11px] text-[var(--graphite-muted)]">{a.sub}</span>
              </button>
            ))}
          </div>

          {/* QUALITY */}
          <p className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Quality</p>
          <div className="grid grid-cols-3 gap-2">
            {QUALITY_TIERS.map((t) => {
              const locked = t.gated && !canUseHighQuality;
              const active = quality === t.id;
              return (
                <button
                  key={t.id}
                  disabled={locked}
                  onClick={() => setQuality(t.id)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border px-2 py-3 transition-colors",
                    active
                      ? "border-[color:var(--twin360-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_16%,transparent)]"
                      : "border-white/[0.07] bg-white/[0.03]",
                    locked && "opacity-40",
                  )}
                >
                  <span className={cn("text-sm font-semibold", active ? "text-white" : "text-[var(--graphite-text-body)]")}>{t.label}</span>
                  <span className="text-[11px] text-[var(--graphite-muted)]">{t.time}</span>
                  <span className="text-[10px] text-[var(--graphite-muted)]">{locked ? "Pro" : t.sub}</span>
                </button>
              );
            })}
          </div>

          {/* COST + TIME */}
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <div className="flex flex-col">
              <span className="flex items-center gap-1.5 text-2xl font-bold tabular-nums text-[color:var(--twin360-blue)]">
                <IconCoins className="h-5 w-5" /> {assetsReady ? credits : "—"}
              </span>
              <span className="text-[11px] text-[var(--graphite-muted)]">credits to process</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-1.5 text-2xl font-bold text-white">
                <IconClock className="h-5 w-5 text-[var(--graphite-muted)]" /> {eta.replace("~", "")}
              </span>
              <span className="text-[11px] text-[var(--graphite-muted)]">estimated time</span>
            </div>
          </div>

          {/* ASSETS (collapsible) */}
          <button
            onClick={() => setAssetsOpen((v) => !v)}
            className="mt-4 flex w-full items-center justify-between py-2 text-left"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
              Captured assets · {assets.length}
            </span>
            <span className="flex items-center gap-2 text-xs text-[var(--graphite-muted)]">
              {formatBytes(totalBytes)}
              <IconChevronDown className={cn("h-4 w-4 transition-transform", assetsOpen && "rotate-180")} />
            </span>
          </button>
          {assetsOpen ? (
            <ul className="flex flex-col">
              {assets.map((a, i) => (
                <li key={i} className="flex items-center justify-between border-t border-white/[0.05] py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-[var(--graphite-text-body)]">
                    {a.status === "ready" ? (
                      <IconCheck className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <IconLoader2 className="h-4 w-4 animate-spin text-[var(--graphite-muted)]" />
                    )}
                    {ASSET_LABELS[a.assetKind] ?? a.assetKind}
                  </span>
                  <span className="tabular-nums text-[var(--graphite-muted)]">{formatBytes(a.fileSizeBytes)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* STICKY CHECKOUT DOCK */}
      <div className="absolute inset-x-0 bottom-0 border-t border-white/[0.08] bg-[var(--graphite-canvas)]/90 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className={cn("font-semibold tabular-nums", sufficient ? "text-[var(--graphite-text-body)]" : "text-red-400")}>
              {balance} credits available
            </span>
            <span className="text-[var(--graphite-muted)]">Total · {assetsReady ? credits : "—"} credits · {eta}</span>
          </div>
          <button
            onClick={() => void handleProcess()}
            disabled={!assetsReady || busy}
            className="flex h-[52px] w-full items-center justify-center rounded-2xl text-[15px] font-bold text-[var(--graphite-canvas)] transition-opacity disabled:opacity-50"
            style={{ background: BLUE }}
          >
            {!assetsReady
              ? "Finishing upload…"
              : busy
                ? "Starting…"
                : !sufficient
                  ? "Add credits to process"
                  : `Process into 3D model · ${credits} credits`}
          </button>
          {error ? <p className="mt-1.5 text-center text-xs text-red-300">{error}</p> : null}
        </div>
      </div>

      <TwinCaptureCreditsSheet
        open={creditsOpen}
        creditsRequired={credits}
        returnTo={`/digital-twin/capture/submit?captureId=${captureId}`}
        onClose={() => setCreditsOpen(false)}
      />
    </div>
  );
}
