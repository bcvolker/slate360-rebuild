"use client";

import { useState } from "react";
import Link from "next/link";
import { FileDown, FilePlus, Loader2 } from "lucide-react";
import type { ProjectDeliverablesTabData } from "@/lib/projects/load-project-deliverables-data";
import { SW360NewReportSheet } from "@/components/sw360/SW360NewReportSheet";

/**
 * Lists this project's existing deliverables with a real Export PDF action
 * (same /api/site-walk/deliverables/[id]/export route the desktop
 * ProjectDeliverablesTab uses — confirmed wired in B1.7), plus a "New
 * report" flow that reuses the existing one-tap
 * /api/site-walk/sessions/[id]/quick-deliverable endpoint (punch list /
 * photo log / field report templates already built, previously unreachable
 * from the SW360 shell).
 */
export function SW360ReportsTabClient({ data }: { data: ProjectDeliverablesTabData }) {
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sw360-green-light)] text-sm font-bold text-white"
      >
        <FilePlus size={16} /> New report
      </button>

      {error ? <p className="text-xs font-semibold text-[var(--sw360-destructive)]">{error}</p> : null}

      {data.deliverables.length === 0 ? (
        <p className="text-sm text-[var(--sw360-charcoal)]/60">
          No reports generated for this project yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
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
      )}

      {sheetOpen ? (
        <SW360NewReportSheet walks={data.walks} onClose={() => setSheetOpen(false)} />
      ) : null}
    </div>
  );
}
