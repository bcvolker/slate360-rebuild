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
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useTwinCreditEstimate } from "@/hooks/useTwinCreditEstimate";
import { TwinJobStatus } from "./TwinJobStatus";
import { TwinCaptureCreditsSheet } from "./TwinCaptureCreditsSheet";

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

type Quality = "draft" | "standard" | "high";

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
  { id: "draft", label: "Draft", time: "~3 min", sub: "Fast preview" },
  { id: "standard", label: "Standard", time: "~12 min", sub: "Best for site walks" },
  { id: "high", label: "High", time: "~25 min", sub: "Maximum detail", gated: true },
];

const CONTEXT_OPTIONS = ["None", "½ block", "1 block", "2 blocks"];

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
  const [queued, setQueued] = useState(
    captureStatus !== "uploaded" && captureStatus !== "draft",
  );
  const [quality, setQuality] = useState<Quality>("draft");
  const [context, setContext] = useState(0);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsOpen, setCreditsOpen] = useState(false);

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
      setQueued(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start processing");
    } finally {
      setBusy(false);
    }
  }

  // ── Processing / complete phase ───────────────────────────────────────────
  if (queued) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[#0B0F15] px-4 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5">
          <h1 className="text-lg font-semibold text-white">Building your 3D twin</h1>
          <p className="text-sm text-zinc-400">{title}</p>
          <TwinJobStatus captureId={captureId} spaceId={spaceId} />
          <p className="text-xs text-zinc-500">
            You can leave this screen — processing continues in the cloud and we’ll notify you when it’s ready.
          </p>
          <button
            onClick={() => router.push("/digital-twin")}
            className="mt-1 self-start text-sm font-medium text-[color:var(--twin360-blue)]"
          >
            Go to My Twins
          </button>
        </div>
      </div>
    );
  }

  // ── Ready phase ───────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#0B0F15]">
      {/* scroll area (padded to clear the sticky dock) */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+150px)] pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]">
        <div className="mx-auto w-full max-w-md px-4">
          {/* top bar */}
          <div className="flex h-11 items-center justify-between">
            <button onClick={() => router.push("/digital-twin")} className="flex items-center gap-1 text-zinc-400">
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Scan ready</span>
            <span className="w-5" />
          </div>

          {/* HERO */}
          <div className="mt-1 flex gap-3">
            <div
              className="flex h-[88px] w-[120px] shrink-0 items-center justify-center rounded-2xl"
              style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${BLUE} 22%, #0B0F15), #11161E)` }}
            >
              <IconCube className="h-8 w-8 text-[color:var(--twin360-blue)]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <h1 className="truncate text-xl font-semibold text-white">{title}</h1>
              <p className="text-[13px] text-zinc-400">
                {[formatDate(createdAt), `${assets.length} asset${assets.length === 1 ? "" : "s"}`, formatBytes(totalBytes)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {assetsReady ? (
                <span className="inline-flex w-fit items-center gap-1 text-xs font-medium text-emerald-400">
                  <IconCheck className="h-3.5 w-3.5" /> Uploaded
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-1 text-xs text-zinc-400">
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
                <span className="text-sm font-semibold text-zinc-100">{a.label}</span>
                <span className="text-[11px] text-zinc-500">{a.sub}</span>
              </button>
            ))}
          </div>

          {/* QUALITY */}
          <p className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Quality</p>
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
                  <span className={cn("text-sm font-semibold", active ? "text-white" : "text-zinc-300")}>{t.label}</span>
                  <span className="text-[11px] text-zinc-400">{t.time}</span>
                  <span className="text-[10px] text-zinc-500">{locked ? "Pro" : t.sub}</span>
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
              <span className="text-[11px] text-zinc-500">credits to process</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-1.5 text-2xl font-bold text-white">
                <IconClock className="h-5 w-5 text-zinc-400" /> {eta.replace("~", "")}
              </span>
              <span className="text-[11px] text-zinc-500">estimated time</span>
            </div>
          </div>

          {/* ASSETS (collapsible) */}
          <button
            onClick={() => setAssetsOpen((v) => !v)}
            className="mt-4 flex w-full items-center justify-between py-2 text-left"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Captured assets · {assets.length}
            </span>
            <span className="flex items-center gap-2 text-xs text-zinc-400">
              {formatBytes(totalBytes)}
              <IconChevronDown className={cn("h-4 w-4 transition-transform", assetsOpen && "rotate-180")} />
            </span>
          </button>
          {assetsOpen ? (
            <ul className="flex flex-col">
              {assets.map((a, i) => (
                <li key={i} className="flex items-center justify-between border-t border-white/[0.05] py-2.5 text-sm">
                  <span className="flex items-center gap-2 text-zinc-300">
                    {a.status === "ready" ? (
                      <IconCheck className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <IconLoader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    )}
                    {ASSET_LABELS[a.assetKind] ?? a.assetKind}
                  </span>
                  <span className="tabular-nums text-zinc-500">{formatBytes(a.fileSizeBytes)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {/* SURROUNDING CONTEXT (preview — wiring to 3D-tiles provider is a follow-up) */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Surrounding context</span>
              <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-zinc-400">Soon</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {CONTEXT_OPTIONS.map((c, i) => (
                <button
                  key={c}
                  disabled={i !== 0}
                  onClick={() => setContext(i)}
                  className={cn(
                    "rounded-xl border px-1 py-2 text-[12px] font-medium transition-colors",
                    context === i
                      ? "border-[color:var(--twin360-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_16%,transparent)] text-white"
                      : "border-white/[0.07] bg-white/[0.03] text-zinc-400",
                    i !== 0 && "opacity-40",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">
              Add photorealistic 3D map tiles around your scan (uses the scan’s GPS).
            </p>
          </div>
        </div>
      </div>

      {/* STICKY CHECKOUT DOCK */}
      <div className="absolute inset-x-0 bottom-0 border-t border-white/[0.08] bg-[#0B0F15]/90 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className={cn("font-semibold tabular-nums", sufficient ? "text-zinc-300" : "text-red-400")}>
              {balance} credits available
            </span>
            <span className="text-zinc-400">Total · {assetsReady ? credits : "—"} credits · {eta}</span>
          </div>
          <button
            onClick={() => void handleProcess()}
            disabled={!assetsReady || busy}
            className="flex h-[52px] w-full items-center justify-center rounded-2xl text-[15px] font-bold text-[#0B0F15] transition-opacity disabled:opacity-50"
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
