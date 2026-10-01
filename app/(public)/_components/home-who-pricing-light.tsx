import Link from "next/link";
import { MKT_L_BTN_PRIMARY, MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER, MKT_L_LEDE } from "@/app/(public)/_components/marketing-styles-light";

const WHO = [
  { title: "General contractors", body: "The beachhead. Pre-cover documentation, progress you can show, and a portal the crew works from." },
  { title: "Architects and engineers", body: "Context before design, and a record of what is actually in the building." },
  { title: "Owners and property managers", body: "A project record that stays open after the crew has moved on." },
] as const;

export function HomeWhoPricingLight() {
  return (
    <section className="py-10 sm:py-12">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>Who it is for</div>
        <h2 className={MKT_L_H2}>East Valley contractors, first</h2>
        <div className="mt-6 grid gap-x-8 sm:grid-cols-3">
          {WHO.map((row) => (
            <div key={row.title} className="border-t border-[var(--mkt-line)] py-4">
              <h3 className="font-serif text-lg font-normal text-[var(--mkt-ink)]">{row.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--mkt-ink-muted)]">{row.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-[var(--mkt-line)] pt-8">
          <div className={MKT_L_KICKER}>Pricing</div>
          <h2 className={MKT_L_H2}>A quote for the scope. A PO or a monthly invoice.</h2>
          <p className={MKT_L_LEDE}>
            Every site is different. Pricing follows the size of the work, how often you need a
            return visit, and which deliverables the project needs. We send a custom quote. Work is
            billed on a purchase order or a monthly invoice.
          </p>
          <Link href="#request-a-visit" className={`mt-5 ${MKT_L_BTN_PRIMARY}`}>
            Get a quote
          </Link>
        </div>
      </div>
    </section>
  );
}
