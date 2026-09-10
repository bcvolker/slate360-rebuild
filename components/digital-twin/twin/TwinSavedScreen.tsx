"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, MoreHorizontal, Scan } from "lucide-react";

import { TwinNewScanSheet } from "@/components/digital-twin/home/TwinNewScanSheet";
import { TwinPoster } from "@/components/digital-twin/home/TwinPoster";
import { TwinStateChip } from "@/components/digital-twin/home/TwinStateChip";
import { TwinRowActionsSheet } from "@/components/digital-twin/project/TwinRowActionsSheet";
import type { TwinSavedState } from "@/lib/digital-twin/load-twin-saved";
import { formatTwinWhen, UNFILED_PROJECT_KEY, type TwinHubState } from "@/lib/digital-twin/twin-hub-state";
import { compact, formatDuration, type TwinCaptureSummary } from "@/lib/twin/capture-summary-pure";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

const LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]";
const TILE = "flex flex-col gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5";

function stateOf(status: string): TwinHubState {
  if (status === "uploading" || status === "draft") return "uploading";
  if (status === "failed") return "failed";
  return "saved";
}

function settingsLine(s: TwinCaptureSummary): string {
  const st = s.settings;
  if (!st) return "Settings not recorded (older app build)";
  const bits: string[] = [];
  bits.push(st.captureMode === "photos" ? `Photos ${st.photoIntervalSec ?? 1} s` : "Video");
  if (st.shutterDenominator) bits.push(`1/${st.shutterDenominator} shutter`);
  else if (st.fastShutter) bits.push("1/120 shutter");
  if (st.exposureLocked) bits.push("AE/WB locked");
  if (st.highResolutionStillCount) bits.push(`${st.highResolutionStillCount} at 12 MP`);
  if (st.lens) bits.push(st.lens.replace("wide_1x", "1× wide"));
  if (st.build) bits.push(`build ${st.build}`);
  return bits.join(" · ");
}

function Receipt({ summary }: { summary: TwinCaptureSummary }) {
  const tiles: [string, string][] = [
    ["Photos", String(summary.photos)],
    ["Clips", String(summary.videos)],
    ["LiDAR points", summary.lidarPoints ? compact(summary.lidarPoints) : "none"],
    ["Camera poses", summary.poses ? compact(summary.poses) : "none"],
    ["Depth frames", summary.depthFrames ? compact(summary.depthFrames) : "none"],
    ["Duration", summary.durationSec ? formatDuration(summary.durationSec) : "—"],
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(([k, v]) => (
          <div key={k} className={TILE}>
            <span className={LABEL}>{k}</span>
            <span className="font-mono text-base font-semibold text-zinc-100">{v}</span>
          </div>
        ))}
      </div>
      <p className="px-0.5 text-[11px] leading-snug text-[var(--graphite-muted)]">{settingsLine(summary)}</p>
      {summary.lidarPoints === 0 ? (
        <p className="px-0.5 text-[11px] text-[var(--destructive)]">No LiDAR was collected on this walk.</p>
      ) : null}
    </div>
  );
}

/**
 * S6 Twin, Saved state: what was collected, where it lives, and the three honest
 * next moves. Processing is a desktop job (Decision 2), so the phone says so
 * instead of offering a cloud button that spends credits.
 */
export function TwinSavedScreen({ twin, projects }: { twin: TwinSavedState; projects: HubTwinProject[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const latest = twin.captures[0] ?? null;
  const state: TwinHubState = latest ? stateOf(latest.status) : "saved";
  // The page is server-rendered; while the phone is still uploading, poll so the state turns
  // to Saved (and the receipt appears) without the user reloading — "stuck at 100 %" was this.
  useEffect(() => {
    if (state !== "uploading") return;
    const id = window.setInterval(() => router.refresh(), 8000);
    return () => window.clearInterval(id);
  }, [router, state]);
  const asHubTwin: HubTwin = {
    id: twin.spaceId,
    title: twin.title,
    status: "draft",
    statusChip: "DRAFT",
    projectId: twin.projectId,
    projectName: twin.projectName,
    updatedAt: latest?.createdAt ?? new Date().toISOString(),
    readyModels: 0,
    hasCapture: twin.captures.length > 0,
    hubState: state,
    hasPoster: twin.hasPoster,
  };
  const projectHref = `/digital-twin/projects/${encodeURIComponent(twin.projectId ?? UNFILED_PROJECT_KEY)}`;

  const copyId = async () => {
    if (!latest) return;
    try {
      await navigator.clipboard.writeText(latest.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the id is printed below */
    }
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-3 px-4 pt-3 pb-3">
      <div className="flex shrink-0 items-center gap-3">
        <TwinPoster spaceId={twin.spaceId} hasPoster={twin.hasPoster} width={240} className="h-16 w-16 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <Link href={projectHref} className={LABEL}>
            {twin.projectName ?? "Quick Scans · unfiled"}
          </Link>
          <h1 className="truncate text-lg font-bold text-zinc-100">{twin.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--graphite-muted)]">
            <TwinStateChip state={state} />
            {latest ? <span>{formatTwinWhen(latest.createdAt)}</span> : null}
          </div>
        </div>
        <button
          type="button"
          aria-label="Twin actions"
          onClick={() => setMenuOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-muted)] hover:text-zinc-100"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain">
        <p className="text-sm leading-relaxed text-zinc-200">
          {state === "uploading"
            ? "Uploading from your phone. Keep the app open until this says Saved."
            : state === "failed"
              ? latest?.errorText ?? "The upload did not finish. Scan again."
              : "Saved · not processed. The capture is in the cloud; the desktop Capture Studio builds the twin and publishes it back here."}
        </p>

        {latest?.summary ? (
          <Receipt summary={latest.summary} />
        ) : latest ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-[var(--graphite-muted)]">
            The receipt is written when the upload completes.
          </p>
        ) : (
          <p className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-[var(--graphite-muted)]">
            Nothing captured yet. Tap Scan to walk this space.
          </p>
        )}

        {latest ? (
          <div className="space-y-1.5">
            <span className={LABEL}>Build on desktop</span>
            <button
              type="button"
              onClick={copyId}
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-left text-sm text-zinc-100"
              data-twin-saved="copy-id"
            >
              {copied ? <Check className="h-4 w-4 text-[var(--twin360-blue)]" aria-hidden /> : <Copy className="h-4 w-4 text-[var(--graphite-muted)]" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{copied ? "Capture ID copied" : "Copy capture ID"}</span>
                <span className="block truncate font-mono text-[11px] text-[var(--graphite-muted)]">{latest.id}</span>
              </span>
            </button>
            <p className="px-0.5 text-[11px] leading-snug text-[var(--graphite-muted)]">
              Open Capture Studio on the desktop, choose Pull capture, paste the ID. The finished twin appears here as Ready.
            </p>
          </div>
        ) : null}

        {twin.captures.length > 1 ? (
          <div className="space-y-1.5">
            <span className={LABEL}>Earlier captures · {twin.captures.length - 1}</span>
            {twin.captures.slice(1).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-200">
                <span>{formatTwinWhen(c.createdAt)}</span>
                <span className="text-[var(--graphite-muted)]">
                  {c.summary ? `${c.summary.photos} photos · ${c.summary.lidarPoints ? compact(c.summary.lidarPoints) : "no"} LiDAR` : c.status}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setScanOpen(true)}
        className="flex min-h-[56px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--twin360-blue)] text-base font-bold text-[var(--graphite-canvas)] transition active:scale-[0.99]"
        data-twin-saved="scan"
      >
        <Scan className="h-6 w-6" strokeWidth={2} aria-hidden />
        Scan again
      </button>

      <TwinRowActionsSheet twin={menuOpen ? asHubTwin : null} onClose={() => setMenuOpen(false)} projects={projects} />
      <TwinNewScanSheet open={scanOpen} onOpenChange={setScanOpen} projects={projects} preselectProjectId={twin.projectId} />
    </div>
  );
}
