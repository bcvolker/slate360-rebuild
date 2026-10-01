"use client";

import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import type { ChecklistItem } from "@/lib/spatial-tour/publish-checklist";
import { formatVisitDate } from "@/lib/spatial-tour/format";
import type { TourVisit } from "@/lib/spatial-tour/types";

type Action = "retry-stills" | "review-stills" | "review-privacy" | "publish" | "unpublish";

const small = "inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Tight status list for one visit: what is still open (with why), the done items on one
 * line, and the single next action. The server runs the same checklist again on publish.
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
  const need = (id: string) => items.find((i) => i.id === id && !i.ok);
  const stillsReady = items.find((i) => i.id === "stills")?.ok ?? false;
  const open = items.filter((i) => !i.ok);
  const done = items.filter((i) => i.ok);

  let primary: { label: string; action: Action } | null = null;
  if (published) primary = { label: "Unpublish", action: "unpublish" };
  else if (canPublish) primary = { label: "Publish to client", action: "publish" };
  // Reviews come after the marking work is done; until then the checkpoint list is the task.
  else if (need("route") || need("checkpoints") || need("privacy-media") || need("look-cone")) primary = null;
  else if (stillsReady && need("stills-reviewed")) primary = { label: "I reviewed every still", action: "review-stills" };
  else if (need("privacy-reviewed") && !need("mask-out-of-view") && !need("stills-clean")) {
    primary = { label: "No operator or mask in view", action: "review-privacy" };
  }

  return (
    <section className={`${t.sectionCard} !p-4`} data-testid="tour-publish-panel">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={t.eyebrow}>Publish this visit</p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
            {published ? `Published · ${formatVisitDate(visit.clientPublishedAt)}` : `Draft · ${done.length}/${items.length} done`}
          </p>
        </div>
        {!published && failedStills > 0 ? (
          <button type="button" className={`${small} border border-[var(--mobile-app-card-border)] text-[var(--graphite-text-body)]`} disabled={busy} onClick={() => onAction("retry-stills")}>
            Retry stills
          </button>
        ) : null}
        {primary ? (
          <button
            type="button"
            className={`${small} bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]`}
            disabled={busy}
            onClick={() => onAction(primary.action)}
            data-testid="tour-publish-primary"
          >
            {primary.label}
          </button>
        ) : null}
      </div>
      {open.length ? (
        <ul className="mt-2 divide-y divide-[var(--mobile-app-card-border)]">
          {open.map((item) => (
            <li key={item.id} className="flex items-baseline gap-2 py-1.5 text-xs" data-testid={`tour-check-${item.id}`} data-ok="false">
              <span aria-hidden className="h-2 w-2 shrink-0 translate-y-[1px] rounded-sm border border-[var(--graphite-muted)]" />
              <span className="min-w-0">
                <span className="font-semibold text-[var(--graphite-text-header)]">{item.label}</span>{" "}
                <span className="text-[var(--graphite-muted)]">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {done.length ? (
        <p className="mt-2 text-xs text-[var(--graphite-muted)]" data-testid="tour-checks-done">
          <span className="font-semibold text-[var(--graphite-text-body)]">Done:</span>{" "}
          {done.map((item, i) => (
            <span key={item.id} data-testid={`tour-check-${item.id}`} data-ok="true">
              {item.label}
              {i < done.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
      ) : null}
      {published ? <p className="mt-2 text-xs text-[var(--graphite-muted)]">Unpublish to change this visit&rsquo;s checkpoints.</p> : null}
    </section>
  );
}
