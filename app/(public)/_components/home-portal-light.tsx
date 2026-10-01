import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER } from "@/app/(public)/_components/marketing-styles-light";

const ROWS = [
  { label: "Site walkthrough", meta: "Walk it in the browser" },
  { label: "Open items", meta: "Punches and follow-ups on the spot" },
  { label: "Documents", meta: "Sheets and reports with the work" },
  { label: "Questions", meta: "Asked from the client link" },
] as const;

export function HomePortalLight() {
  return (
    <section id="portal" className="py-10 sm:py-12">
      <div className={`${MKT_L_CONTAINER} grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12`}>
        <div>
          <div className={MKT_L_KICKER}>Client portal</div>
          <h2 className={MKT_L_H2}>Evidence, items, and questions in one place</h2>
          <p className="mt-3 max-w-[48ch] text-[15.5px] leading-relaxed text-[var(--mkt-ink-muted)]">
            The interactive walkthrough, the punch list, the documents, and the questions share one project.
            Your crew works there. The link you send carries your logo and colors.
          </p>
          <p className="mt-4 max-w-[48ch] border-l-2 border-[var(--mkt-accent-line)] pl-4 text-[14.5px] leading-relaxed text-[var(--mkt-ink)]">
            White-label is for that client link. This site stays Slate360.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)]">
          <div className="border-b border-[var(--mkt-line)] px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--mkt-accent)]">Project record</p>
            <p className="mt-0.5 text-[14px] text-[var(--mkt-ink)]">Your branding on the link</p>
          </div>
          <ul>
            {ROWS.map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-4 border-b border-[var(--mkt-line)] px-4 py-3.5 last:border-b-0">
                <span className="text-[15px] font-semibold text-[var(--mkt-ink)]">{row.label}</span>
                <span className="text-right text-[13px] text-[var(--mkt-ink-muted)]">{row.meta}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
