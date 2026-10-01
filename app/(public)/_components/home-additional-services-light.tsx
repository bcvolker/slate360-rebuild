import { MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";

/**
 * Additional services: the one place secondary offers live on the homepage.
 * Deliberately quiet (muted label, no card, no CTA) so it never competes with
 * the capture service or the request form directly below it. Thermal stays
 * findings-only wording: handheld equipment, no certification mentioned.
 * Sits between Pricing and the form on plain canvas, which keeps the
 * alternating section tones described in HOMEPAGE_LIGHT_REBUILD_PLAN.md §4.6.
 */
const SERVICES = [
  {
    title: "Thermal condition documentation",
    body: "Available on request for specific situations.",
  },
  {
    title: "Delivery systems for small firms",
    body: "Websites, dashboards, and project tooling built for how you work.",
  },
] as const;

export function HomeAdditionalServicesLight() {
  return (
    <section aria-labelledby="additional-services" className="py-12 sm:py-14">
      <div className={MKT_L_CONTAINER}>
        <h2
          id="additional-services"
          className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--mkt-ink-muted)]"
        >
          Additional services
        </h2>
        <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
          {SERVICES.map((row) => (
            <div key={row.title} className="border-t border-[var(--mkt-line)] py-4">
              <h3 className="text-[15px] font-medium text-[var(--mkt-ink)]">{row.title}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--mkt-ink-muted)]">{row.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13.5px] text-[var(--mkt-ink-muted)]">
          Ask about either one in your request below.
        </p>
      </div>
    </section>
  );
}
