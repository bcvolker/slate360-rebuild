import Link from "next/link";
import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER, MKT_L_LEDE } from "@/app/(public)/_components/marketing-styles-light";

const WHO = [
  { title: "General contractors", body: "Pre-cover documentation, progress you can prove, dispute evidence." },
  { title: "Architects", body: "Measured context before design begins." },
  { title: "Engineers", body: "As-builts and above-ceiling coordination against what's actually there." },
  { title: "Owners & property managers", body: "What's behind the wall, after the contractor is gone." },
] as const;

export function HomeWhoPricingLight() {
  return (
    <section className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-16 sm:py-20 lg:py-24">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>Who we work with</div>
        <h2 className={MKT_L_H2}>Anyone who answers for a building</h2>
        <div className="mt-8 grid gap-x-8 gap-y-0 sm:grid-cols-2">
          {WHO.map((row) => (
            <div key={row.title} className="border-t border-[var(--mkt-line)] py-5">
              <h3 className="font-serif text-lg font-normal text-[var(--mkt-ink)]">{row.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--mkt-ink-muted)]">{row.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 border-t border-[var(--mkt-line)] pt-10">
          <div className={MKT_L_KICKER}>Pricing approach</div>
          <h2 className={MKT_L_H2}>Every project is different.</h2>
          <p className={MKT_L_LEDE}>
            Pricing depends on the size and scope of the site, how often you need it revisited, and
            what the project needs documented. Reach out and we&rsquo;ll put together a quote.
          </p>
          <Link
            href="#request-a-visit"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-[10px] bg-[var(--mkt-accent)] px-6 text-[15px] font-semibold text-white transition-all hover:brightness-110"
          >
            Get a quote
          </Link>
        </div>
      </div>
    </section>
  );
}
