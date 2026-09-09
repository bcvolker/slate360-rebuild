"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { TwinPoster } from "@/components/digital-twin/home/TwinPoster";
import { formatTwinWhen, type TwinProjectCard } from "@/lib/digital-twin/twin-hub-state";

export const HOME_PROJECT_CARD_LIMIT = 6;

const LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]";

function ProjectCard({ card }: { card: TwinProjectCard }) {
  return (
    <Link
      href={`/digital-twin/projects/${encodeURIComponent(card.key)}`}
      className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition active:scale-[0.99] hover:border-[var(--accent-border-blue)]"
      data-twin-project-card={card.key}
    >
      <TwinPoster
        spaceId={card.posterTwinId ?? ""}
        hasPoster={card.posterTwinId !== null}
        width={480}
        className="aspect-[4/3] w-full rounded-none border-0 border-b border-b-white/10"
      />
      <span className="flex min-w-0 flex-col gap-0.5 p-2.5">
        <span className="truncate text-sm font-semibold text-zinc-100">{card.name}</span>
        <span className="flex items-center gap-1.5 truncate text-[11px] text-[var(--graphite-muted)]">
          {card.busy ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--twin360-blue)]" aria-hidden /> : null}
          {card.count} twin{card.count === 1 ? "" : "s"}
          {card.readyCount > 0 ? ` · ${card.readyCount} ready` : ""}
        </span>
        <span className="truncate text-[11px] text-[var(--graphite-muted)]">{formatTwinWhen(card.latestAt)}</span>
      </span>
    </Link>
  );
}

/**
 * S1 §4 — projects as cards, not rows. Newest activity first, capped, then
 * "All projects". Quick Scans is one card like any other.
 */
export function TwinHomeProjects({ cards, limit = HOME_PROJECT_CARD_LIMIT }: { cards: TwinProjectCard[]; limit?: number }) {
  const shown = cards.slice(0, limit);
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2" data-twin-home="projects">
      <div className="flex shrink-0 items-baseline justify-between px-0.5">
        <p className={LABEL}>
          Projects
          {cards.length > 0 ? <span className="text-white/25"> · {cards.length}</span> : null}
        </p>
        {cards.length > limit ? (
          <Link href="/digital-twin/projects" className="text-xs font-semibold text-[var(--twin360-blue)]">
            All projects
          </Link>
        ) : null}
      </div>
      {cards.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[var(--graphite-muted)]">
          No twins yet. Tap Scan to walk your first space.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            {shown.map((card) => (
              <ProjectCard key={card.key} card={card} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
