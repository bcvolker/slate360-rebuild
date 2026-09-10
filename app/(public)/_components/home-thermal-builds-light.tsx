import { MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";

/**
 * Thermal: one sentence, no card, no link, no heading weight — deliberate
 * minimization per Brian (2026-09-10): handheld equipment only, no drone,
 * and the ITC cert is expired and never mentioned. See
 * docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §3.10. Sits before the pricing/
 * form section. Technical builds (§3.12) is a separate component — it goes
 * after the form, at the very bottom of the page.
 */
export function HomeThermalLight() {
  return (
    <section className="pt-2">
      <div className={`${MKT_L_CONTAINER} border-t border-[var(--mkt-line)] pt-6 text-[13.5px] text-[var(--mkt-ink-muted)]`}>
        <p>Thermal condition documentation is also available on request for specific situations.</p>
      </div>
    </section>
  );
}

/** Technical builds — one quiet line, bottom of page, above the footer. */
export function HomeBuildsLineLight() {
  return (
    <section className="py-10">
      <div className={`${MKT_L_CONTAINER} border-t border-[var(--mkt-line)] pt-8 text-[13.5px] text-[var(--mkt-ink-muted)]`}>
        <p>
          <span className="font-medium text-[var(--mkt-ink)]">We build delivery systems, too.</span>{" "}
          Websites, dashboards, and project tooling for small firms — ask us about it.
        </p>
      </div>
    </section>
  );
}
