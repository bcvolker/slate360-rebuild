"use client";

import { useState } from "react";
import Link from "next/link";
import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER, MKT_L_LEDE } from "./marketing-styles-light";

export type HomeExample = {
  id: string;
  /** Tab label — the deliverable type, e.g. "Walkthrough", "360° tour", "Floor plan". */
  tabLabel: string;
  title: string;
  description: string;
  /** A real photo/still from the deliverable. No fabricated graphics. */
  posterSrc: string;
  /** Where "Open" sends the visitor — a real /w/[token] or /portal/[token] link. */
  href: string;
};

/**
 * Fill this in once a real, permissioned project exists — one entry per
 * distinct deliverable TYPE Brian wants a prospect to be able to switch
 * between (e.g. a walkthrough vs. an aerial/360 tour vs. a floor plan).
 * These are real, separate links opened full-page, never an embedded
 * iframe/modal and never the internal product's own Overview/Plan/Items
 * sub-navigation reproduced as marketing decoration — see
 * docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §3.7/§4.4.
 *
 * Empty by default: the section renders nothing until this has entries —
 * no "coming soon" placeholder tiles. Leave empty until real content ships.
 */
export const HOME_EXAMPLES: HomeExample[] = [];

export function HomeExamplesLight() {
  const [active, setActive] = useState(0);
  if (HOME_EXAMPLES.length === 0) return null;
  const current = HOME_EXAMPLES[active];

  return (
    <section id="examples" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-16 sm:py-20 lg:py-24">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>See a deliverable</div>
        <h2 className={MKT_L_H2}>Open a real example</h2>
        <p className={MKT_L_LEDE}>The same experience your stakeholders receive — walk through it yourself.</p>

        {HOME_EXAMPLES.length > 1 ? (
          <div className="mt-8 flex flex-wrap gap-2">
            {HOME_EXAMPLES.map((ex, i) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setActive(i)}
                className={`h-11 rounded-[9px] px-4 text-[14px] font-semibold transition-colors ${
                  i === active ? "bg-[var(--mkt-accent)] text-white" : "border border-[var(--mkt-line)] bg-[var(--mkt-surface)] text-[var(--mkt-ink-muted)] hover:text-[var(--mkt-ink)]"
                }`}
              >
                {ex.tabLabel}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] shadow-[0_20px_50px_-24px_rgba(26,36,51,0.18)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- real remote posters; not worth next/image config for a handful of example photos */}
          <img src={current.posterSrc} alt={current.title} className="aspect-video w-full object-cover" />
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h3 className="font-serif text-lg font-normal text-[var(--mkt-ink)]">{current.title}</h3>
              <p className="mt-0.5 text-[13.5px] text-[var(--mkt-ink-muted)]">{current.description}</p>
            </div>
            <Link
              href={current.href}
              target="_blank"
              rel="noopener"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-[9px] bg-[var(--mkt-accent)] px-5 text-[14px] font-semibold text-white transition-all hover:brightness-110"
            >
              Open the walkthrough
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
