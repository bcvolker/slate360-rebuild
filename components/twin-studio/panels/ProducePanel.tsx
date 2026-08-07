"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { TwinStudioSpace } from "@/lib/digital-twin/load-twin-studio-data";
import type { TwinSpaceViewerData } from "@/lib/digital-twin/load-space-viewer";
import type { TwinJobSnapshot } from "@/hooks/useTwinJobRealtime";
import { TwinModelViewer } from "@/components/digital-twin/TwinModelViewer";
import { ProduceVersionList, type ProduceVersion } from "./ProduceVersionList";

type Version = ProduceVersion;

type Quality = "standard" | "high";
type TrainProfile = "" | "baseline" | "quality" | "visual";

/**
 * F1 — the real content of Twin Studio's Produce tab: version history with
 * quality metrics + which trainProfile arm produced each one (B1), publish,
 * and a dispatch form that can fire any A/B arm (not just the quality tier
 * TwinVersionsPanel's compact mobile-sheet version exposes).
 */
export function ProducePanel({
  space,
  job,
  viewer,
}: {
  space: TwinStudioSpace;
  job: TwinJobSnapshot | null;
  /** UX-FIX: published/primary model of any format, rendered as the hero —
   * one click from the dashboard to actually seeing the model. */
  viewer: TwinSpaceViewerData | null;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState<Quality>("standard");
  const [trainProfile, setTrainProfile] = useState<TrainProfile>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/digital-twin/spaces/${space.spaceId}/models`);
    const json = (await res.json().catch(() => ({}))) as { versions?: Version[] };
    if (res.ok) setVersions(json.versions ?? []);
    setLoading(false);
  }, [space.spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  // A completed/failed job means a new version may exist — refresh.
  useEffect(() => {
    if (job?.status === "completed" || job?.status === "failed") void load();
  }, [job?.status, load]);

  const dispatchTarget = versions.find((v) => v.isPublished) ?? versions[0] ?? null;
  const canDispatch = Boolean(dispatchTarget || space.latestCaptureId);
  const isProcessing = job?.status === "processing" || job?.status === "queued";

  const dispatch = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const body = {
      quality,
      ...(trainProfile ? { trainProfile } : {}),
    };
    try {
      const res = dispatchTarget
        ? await fetch(`/api/digital-twin/models/${dispatchTarget.id}/reprocess`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/digital-twin/captures/${space.latestCaptureId}/reprocess`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not start reprocessing");
      setNotice(
        "Dispatched — this runs in the cloud (typically 20–40 min). The new version appears below when it's ready; the published link is unchanged until you promote it.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start reprocessing");
    } finally {
      setBusy(false);
    }
  }, [dispatchTarget, space.latestCaptureId, quality, trainProfile]);

  const publish = useCallback(
    async (modelId: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch(`/api/digital-twin/models/${modelId}/publish`, { method: "POST" });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not publish this version");
        setNotice("Published — the share link now shows this version.");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not publish this version");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[var(--graphite-muted)]" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Hero: the published/primary model, immediately — the whole point of
          opening a space. Formats beyond splat (GLB, Potree, pano) render via
          the same format-aware viewer the twin detail page uses. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {viewer ? (
          <TwinModelViewer
            viewerKind={viewer.viewerKind}
            modelUrl={viewer.modelUrl}
            modelTitle={viewer.modelTitle}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 p-6 text-center">
            <p className="text-sm font-medium text-zinc-200">No published model yet</p>
            <p className="max-w-sm text-xs text-[var(--graphite-muted)]">
              {job?.status === "processing" || job?.status === "queued"
                ? `Reconstruction is running — ${job.stage ?? "working"} ${job.progress_pct ?? 0}%.`
                : "Once a reconstruction completes, publish a version on the right and it renders here."}
            </p>
          </div>
        )}
      </div>

      {/* Rail: dispatch + versions */}
      <div className="w-[380px] shrink-0 overflow-y-auto border-l border-[var(--mobile-app-card-border)] p-3.5">
      <div className="space-y-4">
        {/* Dispatch — the reprocess + A/B-arm control the plan's B-series
            experiments used from the CLI (scripts/ops/dispatch-twin-experiment.mjs),
            now reachable from the studio itself. */}
        <section className="rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_6%,transparent)] p-3.5">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
            Reprocess
          </p>
          {!canDispatch ? (
            <p className="text-[11px] text-[var(--graphite-muted)]">
              No capture on this space yet — reprocessing needs a source capture first.
            </p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[11px] leading-relaxed text-[var(--graphite-muted)]">
                Creates a new version non-destructively. The published/live link is unchanged
                until the new version is promoted below. Baseline stays the promoted default —
                per the pipeline ledger, quality/visual profiles have both measured worse on real
                data. Only pick an arm here to run an A/B, not because it sounds better.
              </p>
              <div className="flex items-center gap-1.5">
                {(["standard", "high"] as Quality[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q)}
                    disabled={busy}
                    className={`h-8 flex-1 rounded-lg border text-xs font-semibold capitalize transition disabled:opacity-50 ${
                      quality === q
                        ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] text-[var(--twin360-blue)]"
                        : "border-white/10 text-zinc-300"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {([
                  { id: "", label: "Default" },
                  { id: "baseline", label: "Baseline" },
                  { id: "quality", label: "Quality" },
                  { id: "visual", label: "Visual" },
                ] as { id: TrainProfile; label: string }[]).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTrainProfile(p.id)}
                    disabled={busy}
                    title={p.id ? "worker.py TRAIN_PROFILE arm — for A/B experiments" : "worker's env default"}
                    className={`h-8 flex-1 rounded-lg border text-xs font-semibold transition disabled:opacity-50 ${
                      trainProfile === p.id
                        ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] text-[var(--twin360-blue)]"
                        : "border-white/10 text-zinc-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void dispatch()}
                disabled={busy || isProcessing}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--twin360-blue)] text-sm font-bold text-[var(--graphite-canvas)] disabled:opacity-50"
              >
                {busy || isProcessing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {isProcessing ? `Processing — ${job?.stage ?? "working"} ${job?.progress_pct ?? 0}%` : "Reprocess"}
              </button>
            </div>
          )}
        </section>

        {notice ? (
          <p className="rounded-lg border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] px-3 py-2 text-xs leading-snug text-[var(--graphite-text-body)]">
            {notice}
          </p>
        ) : null}
        {error ? <p className="text-xs text-red-300">{error}</p> : null}

        {/* Versions */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
            Versions · {versions.length}
          </p>
          <ProduceVersionList
            spaceId={space.spaceId}
            versions={versions}
            busy={busy}
            onPublish={(id) => void publish(id)}
          />
        </section>
      </div>
      </div>
    </div>
  );
}
