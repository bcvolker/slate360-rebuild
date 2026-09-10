import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER, MKT_L_LEDE } from "@/app/(public)/_components/marketing-styles-light";

const ROWS = [
  { n: "01", title: "A dated record you can reopen", body: "After the site has changed, the earlier version is still there." },
  { n: "02", title: "Documents pinned exactly where they apply", body: "And they stay there across later visits." },
  { n: "03", title: "Measurement tools built in", body: "Useful for a rough sense of scale and distance — not a substitute for a formal survey." },
  { n: "04", title: "Shares that carry your name", body: "Not a vendor's branding." },
  { n: "05", title: "One place for the whole record", body: "Instead of a folder of separate files." },
] as const;

export function HomeDifferentLight() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>What makes it different</div>
        <h2 className={MKT_L_H2}>Built for the people who answer for the building</h2>
        <p className={MKT_L_LEDE}>
          Not another app to manage — a working record your project team plans against, and your
          clients actually open.
        </p>
        <div className="mt-8">
          {ROWS.map((row) => (
            <div
              key={row.n}
              className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4 border-t border-[var(--mkt-line)] py-5 sm:grid-cols-[58px_minmax(0,1fr)_minmax(0,1.3fr)] sm:gap-x-6"
            >
              <span className="font-serif text-[15px] text-[var(--mkt-accent)]">{row.n}</span>
              <h3 className="text-[15.5px] font-semibold text-[var(--mkt-ink)]">{row.title}</h3>
              <p className="col-span-2 mt-1 text-[14px] leading-relaxed text-[var(--mkt-ink-muted)] sm:col-span-1 sm:mt-0">
                {row.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-[70ch] text-[13.5px] text-[var(--mkt-ink-muted)]">
          Where a legal dimension is required, a laser still governs.
        </p>
      </div>
    </section>
  );
}
