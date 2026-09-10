import { MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";

/**
 * Short pre-cover urgency beat — compressed, no icons, no themed section
 * chrome. See docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §3.3.
 */
export function HomeProblemLight() {
  return (
    <section className="pb-14 sm:pb-20">
      <div className={MKT_L_CONTAINER}>
        <div className="max-w-[58ch] border-l-2 border-[var(--mkt-accent-line)] pl-5 sm:pl-6">
          <p className="font-serif text-xl leading-relaxed text-[var(--mkt-ink)] sm:text-2xl">
            Something on a job site is often about to become invisible — a ceiling closing, a wall
            going up, a pour covering what&rsquo;s underneath.
          </p>
          <p className="mt-3.5 text-[15.5px] leading-relaxed text-[var(--mkt-ink-muted)]">
            Once it&rsquo;s covered, the only record left is memory. We capture it while it&rsquo;s
            still visible, and hand you back something you can open later.
          </p>
        </div>
      </div>
    </section>
  );
}
