import { MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";

/**
 * Thermal: one sentence, no card, no link, no heading weight — deliberate
 * minimization per Brian (2026-09-10): handheld equipment only, no drone,
 * and the ITC cert is expired and never mentioned. Technical builds: one
 * line, bottom of page. See docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §3.10/§3.12.
 */
export function HomeThermalBuildsLight() {
  return (
    <section className="py-10">
      <div className={`${MKT_L_CONTAINER} space-y-3 border-t border-[var(--mkt-line)] pt-8 text-[13.5px] text-[var(--mkt-ink-muted)]`}>
        <p>Thermal condition documentation is also available on request for specific situations.</p>
        <p>
          <span className="font-medium text-[var(--mkt-ink)]">We build delivery systems, too.</span>{" "}
          Websites, dashboards, and project tooling for small firms — ask us about it.
        </p>
      </div>
    </section>
  );
}
