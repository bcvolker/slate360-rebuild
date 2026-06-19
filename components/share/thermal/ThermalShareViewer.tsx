"use client";

import { useEffect, useState } from "react";
import type { ThermalShareViewerData } from "@/lib/thermal/share-viewer-types";
import { ThermalShareSlide } from "@/components/share/thermal/ThermalShareSlide";
import { ThermalShareQA } from "@/components/share/thermal/ThermalShareQA";

type Props = {
  data: ThermalShareViewerData | null;
  token?: string;
  tokenState?: "invalid" | "expired" | "revoked" | "max_views" | "unavailable";
  embed?: boolean;
};

export function ThermalShareViewer({ data, token, tokenState, embed = false }: Props) {
  const [index, setIndex] = useState(0);

  // Deep-link: ?c=<captureId> (from a report QR) opens that image directly.
  useEffect(() => {
    if (!data?.captures?.length || typeof window === "undefined") return;
    const cid = new URLSearchParams(window.location.search).get("c");
    if (!cid) return;
    const i = data.captures.findIndex((c) => c.id === cid);
    if (i >= 0) setIndex(i);
  }, [data]);

  if (tokenState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--graphite-canvas)] px-6">
        <p className="text-sm text-[var(--graphite-muted)]">This thermal share link is {tokenState}.</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--graphite-canvas)] px-6">
        <p className="text-sm text-[var(--graphite-muted)]">Unable to load thermal inspection.</p>
      </main>
    );
  }

  const branding = data.branding;
  const summary = data.summaryMetrics;
  const canDownload = data.role === "download" && token;
  const captures = data.captures;
  const current = captures[Math.min(index, captures.length - 1)];
  const flagged = (c: (typeof captures)[number]) => (c.anomalies as unknown[] | null)?.length ?? 0;

  return (
    <main className={`bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)] ${embed ? "p-4" : "min-h-screen px-4 py-8"}`}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 border-b border-[var(--mobile-app-card-border)] pb-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
            {branding.company_name || "Thermal inspection report"}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--graphite-text-header)]">{data.sessionName}</h1>
          {branding.show_metrics !== false ? (
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--graphite-muted)]">
              <span>Captures: {String(summary.total_captures ?? captures.length)}</span>
              <span>Max temp: {summary.max_detected_temp_c != null ? `${summary.max_detected_temp_c}°C` : "—"}</span>
              <span>Action items: {String(summary.critical_anomalies ?? 0)}</span>
            </div>
          ) : null}
          {canDownload ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`/api/share/thermal/${token}/report`} className="rounded-full bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[#0B0F15]">
                Download PDF
              </a>
              <a href={`/api/share/thermal/${token}/export?format=csv`} className="rounded-full border border-[var(--mobile-app-card-border)] px-4 py-2 text-sm font-semibold">
                Export CSV
              </a>
            </div>
          ) : null}
        </header>

        {captures.length === 0 ? (
          <p className="text-sm text-[var(--graphite-muted)]">No images in this inspection yet.</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="rounded-lg border border-[var(--mobile-app-card-border)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              <p className="text-xs text-[var(--graphite-muted)]">
                Image {Math.min(index + 1, captures.length)} of {captures.length}
              </p>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(captures.length - 1, i + 1))}
                disabled={index >= captures.length - 1}
                className="rounded-lg border border-[var(--mobile-app-card-border)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>

            {current ? <ThermalShareSlide capture={current} /> : null}

            {/* Thumbnail strip — click to jump */}
            <div className="mt-3 flex gap-2 overflow-x-auto rounded-xl border border-[var(--mobile-app-card-border)] p-2">
              {captures.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border bg-[#111827] ${
                    i === index ? "border-[var(--graphite-primary)]" : "border-[var(--mobile-app-card-border)]"
                  }`}
                  title={c.filename ?? "Capture"}
                >
                  {c.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.previewUrl} alt={c.filename ?? ""} className="h-full w-full object-cover" />
                  ) : null}
                  {flagged(c) ? (
                    <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#fb923c] px-1 text-[8px] font-bold text-black">
                      {flagged(c)}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </>
        )}

        {token ? <ThermalShareQA token={token} /> : null}

        {branding.custom_footer ? (
          <footer className="mt-8 text-xs text-[var(--graphite-muted)]">{branding.custom_footer}</footer>
        ) : null}
      </div>
    </main>
  );
}
