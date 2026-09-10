import {
  MKT_L_CONTAINER,
  MKT_L_H2,
  MKT_L_KICKER,
  MKT_L_LEDE,
} from "@/app/(public)/_components/marketing-styles-light";

const ROWS = [
  {
    n: "01",
    title: "We capture the site",
    body: "Interior, exterior, and aerial, scoped to the project.",
  },
  {
    n: "02",
    title: "You get an interactive record",
    body: "Walk through it, review it, revisit it later — from any browser.",
  },
  {
    n: "03",
    title: "It lives in your portal, under your own branding",
    body: "Your logo and colors carry through when you open it in a meeting or send it to a client, so what they see looks like your project, not a vendor's tool.",
  },
  {
    n: "04",
    title: "Drawings and documents pin right where they apply",
    body: "A submittal, a proposal, an invoice, or a plan sheet attached to the exact spot in the record it relates to — so context doesn't live in a separate inbox.",
  },
] as const;

export function HomeWhatYouGetLight() {
  return (
    <section id="what-you-get" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-16 sm:py-20 lg:py-24">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>What you get</div>
        <h2 className={MKT_L_H2}>A working record, not another app to manage</h2>
        <p className={MKT_L_LEDE}>
          Every engagement produces the same package: a record of the site, delivered to a portal
          built for handing off.
        </p>
        <div className="mt-10">
          {ROWS.map((row) => (
            <div
              key={row.n}
              className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-[var(--mkt-line)] py-6 sm:grid-cols-[58px_minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-x-6"
            >
              <span className="font-serif text-[15px] text-[var(--mkt-accent)]">{row.n}</span>
              <h3 className="font-serif text-lg font-normal text-[var(--mkt-ink)] sm:text-xl">{row.title}</h3>
              <p className="col-span-2 text-[14.5px] leading-relaxed text-[var(--mkt-ink-muted)] sm:col-span-1">
                {row.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
