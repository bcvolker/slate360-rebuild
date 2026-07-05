"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Check, Loader2, History } from "lucide-react";

type Version = {
  id: string;
  title: string | null;
  createdAt: string;
  isPublished: boolean;
  fileSizeBytes: number | null;
  psnr: number | null;
  splatCount: number | null;
  quality: string | null;
  captureId: string | null;
};

type Quality = "standard" | "high";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

/**
 * Twin Slice 0 — the reprocess loop. Lists a space's model versions, lets the
 * user re-run reconstruction (quality + credit estimate up front) without
 * touching the live model, and promote any finished version to published.
 */
export function TwinVersionsPanel({ spaceId }: { spaceId: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState<Quality>("standard");
  const [estimate, setEstimate] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const publishedCaptureId =
    versions.find((v) => v.isPublished)?.captureId ?? versions[0]?.captureId ?? null;

  const load = useCallback(async () => {
    const res = await fetch(`/api/digital-twin/spaces/${spaceId}/models`);
    const json = (await res.json().catch(() => ({}))) as { versions?: Version[] };
    if (res.ok) setVersions(json.versions ?? []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Lazy credit estimate for the reprocess (uses the source capture behind the
  // published/newest version).
  useEffect(() => {
    if (!publishedCaptureId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/digital-twin/jobs/estimate?capture_id=${encodeURIComponent(publishedCaptureId)}&output_format=spz`,
      );
      const json = (await res.json().catch(() => ({}))) as {
        estimate?: { creditsRequired?: number };
      };
      if (!cancelled && res.ok) setEstimate(json.estimate?.creditsRequired ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [publishedCaptureId]);

  const reprocess = useCallback(async () => {
    const target = versions.find((v) => v.isPublished) ?? versions[0];
    if (!target) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/digital-twin/models/${target.id}/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not start reprocessing");
      setNotice(
        "Reprocessing started — this runs in the cloud (usually 20–40 min). The new version appears here when it's ready; your current link is unchanged until you publish it.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start reprocessing");
    } finally {
      setBusy(false);
    }
  }, [quality, versions]);

  const publish = useCallback(
    async (modelId: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch(`/api/digital-twin/models/${modelId}/publish`, { method: "POST" });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not publish this version");
        setNotice("Published — your share link now shows this version.");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not publish this version");
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  if (loading) return null;
  if (versions.length === 0) return null;

  const canReprocess = Boolean(publishedCaptureId);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center gap-2">
        <History className="h-4 w-4 text-[var(--graphite-muted)]" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
          Versions
        </p>
      </div>

      {/* Reprocess control */}
      {canReprocess ? (
        <div className="mb-3 space-y-2 rounded-lg border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_6%,transparent)] p-2.5">
          <p className="text-[11px] leading-snug text-[var(--graphite-muted)]">
            Not happy with the result? Re-run reconstruction. It creates a new version — your live
            link stays as-is until you publish the new one.
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
          <button
            type="button"
            onClick={() => void reprocess()}
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--twin360-blue)] text-sm font-bold text-[var(--graphite-canvas)] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reprocess
            {estimate !== null ? (
              <span className="font-semibold opacity-80">· ~{estimate} credits</span>
            ) : null}
          </button>
        </div>
      ) : null}

      {notice ? (
        <p className="mb-2 rounded-lg border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_10%,transparent)] px-2.5 py-2 text-[11px] leading-snug text-[var(--graphite-text-body)]">
          {notice}
        </p>
      ) : null}
      {error ? <p className="mb-2 text-[11px] text-red-300">{error}</p> : null}

      <ul className="space-y-1.5">
        {versions.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] px-2.5 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-100">{formatDate(v.createdAt)}</p>
              <p className="mt-0.5 text-[10px] text-[var(--graphite-muted)]">
                {v.quality ? `${v.quality} · ` : ""}
                {v.psnr !== null ? `PSNR ${v.psnr.toFixed(1)}` : "—"}
                {v.splatCount !== null ? ` · ${(v.splatCount / 1000).toFixed(0)}k pts` : ""}
              </p>
            </div>
            {v.isPublished ? (
              <span className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] px-2 py-1 text-[10px] font-semibold text-[var(--twin360-blue)]">
                <Check className="h-3 w-3" /> Live
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void publish(v.id)}
                disabled={busy}
                className="shrink-0 rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-zinc-200 transition hover:border-[var(--accent-border-blue)] hover:text-[var(--twin360-blue)] disabled:opacity-50"
              >
                Publish
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
