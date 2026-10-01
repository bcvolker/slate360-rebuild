import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER } from "@/app/(public)/_components/marketing-styles-light";

const STEPS = [
  { n: "01", title: "We visit", body: "Greater Phoenix job sites. We capture what you scoped, on your schedule." },
  { n: "02", title: "It publishes", body: "The interactive walkthrough and the other files land in your portal." },
  { n: "03", title: "The crew works it", body: "Punch lists in Site Walk. Documents and questions stay on the record." },
  { n: "04", title: "You send the link", body: "Your client opens your brand in the browser." },
] as const;

export function HomeHowItWorksLight() {
  return (
    <section id="speed" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-10 sm:py-12">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>After the visit</div>
        <h2 className={MKT_L_H2}>Captured locally. In the portal your team already opens.</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.n} className="rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] p-4">
              <span className="font-serif text-[13px] text-[var(--mkt-accent)]">{step.n}</span>
              <h3 className="mt-1 text-[16px] font-semibold text-[var(--mkt-ink)]">{step.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--mkt-ink-muted)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
