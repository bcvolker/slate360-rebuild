import Link from "next/link";
import type { ProjectDeliverablesTabData } from "@/lib/projects/load-project-deliverables-data";

/**
 * Lists this project's existing deliverables (PDF/interactive reports).
 * Generating NEW reports from the SW360 shell isn't wired yet (B3 — the
 * reports loop) so this stays read-only rather than showing a button that
 * doesn't work.
 */
export function SW360ReportsTabClient({ data }: { data: ProjectDeliverablesTabData }) {
  if (data.deliverables.length === 0) {
    return (
      <p className="text-sm text-[var(--sw360-charcoal)]/60">
        No reports generated for this project yet.
      </p>
    );
  }

  return (
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
            {d.shareToken ? (
              <Link
                href={`/view/${d.shareToken}`}
                className="text-xs font-bold text-[var(--sw360-green-light)]"
              >
                {d.unansweredCount > 0 ? `View · ${d.unansweredCount} unanswered` : "View"}
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
