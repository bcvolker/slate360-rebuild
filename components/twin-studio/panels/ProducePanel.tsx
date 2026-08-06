"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Eye, Loader2, RefreshCw } from "lucide-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinStudioSpace } from "@/lib/digital-twin/load-twin-studio-data";
import type { TwinJobSnapshot } from "@/hooks/useTwinJobRealtime";

type Version = {
  id: string;
  title: string | null;
  createdAt: string;
  isPublished: boolean;
  fileSizeBytes: number | null;
  psnr: number | null;
  splatCount: number | null;
  quality: string | null;
  trainProfile: string | null;
  captureId: string | null;
};

type Quality = "standard" | "high";
type TrainProfile = "" | "baseline" | "quality" | "visual";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

/**
 * F1 — the real content of Twin Studio's Produce tab: version history with
 * quality metrics + which trainProfile arm produced each one (B1), publish,
 * and a dispatch form that can fire any A/B arm (not just the quality tier
 * TwinVersionsPanel's compact mobile-sheet version exposes).
 */
export function ProducePanel({
  space,
  job,
}: {
  space: TwinStudioSpace;
  job: TwinJobSnapshot | null;
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
    <div className="h-full min-h-0 overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
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
          {versions.length === 0 ? (
            <p className="text-xs text-[var(--graphite-muted)]">No ready versions yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-zinc-100">{formatDate(v.createdAt)}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--graphite-muted)]">
                      {v.psnr !== null ? `PSNR ${v.psnr.toFixed(2)}` : "PSNR —"}
                      {v.quality ? ` · ${v.quality}` : ""}
                      {v.trainProfile ? ` · ${v.trainProfile}` : ""}
                      {v.splatCount !== null ? ` · ${(v.splatCount / 1000).toFixed(0)}k pts` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {/* D-gap fix: preview any version WITHOUT publishing it —
                        the R7.5 visual gate previously required promoting a
                        model just to look at it. */}
                    <Link
                      href={`/twin-studio/${space.spaceId}/preview/${v.id}`}
                      className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-zinc-200 transition hover:border-[var(--accent-border-blue)] hover:text-[var(--twin360-blue)]"
                    >
                      <Eye className="size-3" aria-hidden /> Preview
                    </Link>
                    {v.isPublished ? (
                      <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${twinAccent.iconChip}`}>
                        <Check className="size-3" /> Live
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void publish(v.id)}
                        disabled={busy}
                        className="rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-zinc-200 transition hover:border-[var(--accent-border-blue)] hover:text-[var(--twin360-blue)] disabled:opacity-50"
                      >
                        Publish
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
