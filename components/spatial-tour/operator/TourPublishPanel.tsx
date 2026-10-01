"use client";

import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import type { ChecklistItem } from "@/lib/spatial-tour/publish-checklist";
import { formatVisitDate } from "@/lib/spatial-tour/format";
import type { TourVisit } from "@/lib/spatial-tour/types";

type Action = "retry-stills" | "review-stills" | "review-privacy" | "publish" | "unpublish";

/**
 * Checklist for one visit. The next unmet step is the one primary action; the server runs
 * the same checklist again on publish.
 */
export function TourPublishPanel({
  visit,
  items,
  canPublish,
  failedStills,
  busy,
  onAction,
}: {
  visit: TourVisit;
  items: ChecklistItem[];
  canPublish: boolean;
  /** Stills whose extraction failed (as opposed to still running). */
  failedStills: number;
  busy: boolean;
  onAction: (action: Action) => void;
}) {
  const published = Boolean(visit.clientPublishedAt);
  const stillsReady = items.find((i) => i.id === "stills")?.ok ?? false;
  const need = (id: string) => items.find((i) => i.id === id && !i.ok);

  let primary: { label: string; action: Action } | null = null;
  if (published) primary = { label: "Unpublish", action: "unpublish" };
  else if (canPublish) primary = { label: "Publish to client", action: "publish" };
  // Reviews come after the marking work is done; until then the checkpoint list is the task.
  else if (need("route") || need("checkpoints") || need("privacy-media")) primary = null;
  else if (stillsReady && need("stills-reviewed")) primary = { label: "I reviewed every still", action: "review-stills" };
  else if (need("privacy-reviewed") && !need("privacy-media")) primary = { label: "Privacy review done", action: "review-privacy" };

  return (
    <section className={t.sectionCard} data-testid="tour-publish-panel">
      <div className="flex items-center justify-between gap-2">
        <p className={t.eyebrow}>Publish this visit</p>
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
          {published ? `Published · ${formatVisitDate(visit.clientPublishedAt)}` : "Draft"}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 text-sm" data-testid={`tour-check-${item.id}`} data-ok={item.ok}>
            <span
              aria-hidden
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${item.ok ? "bg-[var(--graphite-primary)]" : "border border-[var(--graphite-muted)]"}`}
            />
            <span className="min-w-0">
              <span className="block font-semibold text-[var(--graphite-text-header)]">{item.label}</span>
              <span className="block text-xs text-[var(--graphite-muted)]">{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {primary ? (
          <button type="button" className={`${t.primaryButton} disabled:cursor-not-allowed disabled:opacity-40`} disabled={busy} onClick={() => onAction(primary.action)} data-testid="tour-publish-primary">
            {primary.label}
          </button>
        ) : null}
        {!published && failedStills > 0 ? (
          <button type="button" className={t.secondaryButton} disabled={busy} onClick={() => onAction("retry-stills")}>
            Retry stills
          </button>
        ) : null}
      </div>
      {published ? (
        <p className="mt-3 text-xs text-[var(--graphite-muted)]">Unpublish to change this visit&rsquo;s checkpoints.</p>
      ) : null}
    </section>
  );
}
