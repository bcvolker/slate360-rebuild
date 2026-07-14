"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDown, Loader2 } from "lucide-react";
import type { ProjectDeliverablesTabData } from "@/lib/projects/load-project-deliverables-data";

/**
 * Lists this project's existing deliverables (PDF/interactive reports) with
 * a real Export PDF action (same /api/site-walk/deliverables/[id]/export
 * route the desktop ProjectDeliverablesTab uses — confirmed wired in B1.7).
 * Generating NEW reports from scratch isn't wired yet (B3 — the reports
 * loop), so there's no "create report" button here.
 */
export function SW360ReportsTabClient({ data }: { data: ProjectDeliverablesTabData }) {
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportPdf(id: string) {
    setExportingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/site-walk/deliverables/${id}/export`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as { download_url?: string | null; error?: string } | null;
      if (!res.ok || !body?.download_url) throw new Error(body?.error ?? "Couldn't generate the PDF.");
      window.open(body.download_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate the PDF.");
    } finally {
      setExportingId(null);
    }
  }

  if (data.deliverables.length === 0) {
    return (
      <p className="text-sm text-[var(--sw360-charcoal)]/60">
        No reports generated for this project yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}
      {data.deliverables.map((d) => (
        <div key={d.id} className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{d.title}</p>
            <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
              {d.status}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-[var(--sw360-charcoal)]/50">{d.deliverableType}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={exportingId === d.id}
                onClick={() => void exportPdf(d.id)}
                className="flex items-center gap-1 text-xs font-bold text-[var(--sw360-green-light)] disabled:opacity-60"
              >
                {exportingId === d.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <FileDown size={12} />
                )}
                PDF
              </button>
              {d.shareToken ? (
                <Link href={`/view/${d.shareToken}`} className="text-xs font-bold text-[var(--sw360-green-light)]">
                  {d.unansweredCount > 0 ? `View · ${d.unansweredCount} unanswered` : "View"}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
