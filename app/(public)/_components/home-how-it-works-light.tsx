import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER } from "@/app/(public)/_components/marketing-styles-light";

const STEPS = [
  { n: "01", title: "Reach out", body: "Tell us the site, what is about to be covered, and the timeline." },
  { n: "02", title: "Site visit", body: "We come to the job and capture it, planned around your schedule." },
  { n: "03", title: "Processing", body: "Your deliverables are produced and reviewed." },
  { n: "04", title: "Portal access", body: "You receive a finished, controlled record in your portal." },
  { n: "05", title: "You share it", body: "Send a scoped link to your client, owner, or team, under your own name." },
] as const;

export function HomeHowItWorksLight() {
  return (
    <section id="how-it-works" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-16 sm:py-20 lg:py-24">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>How it works</div>
        <h2 className={MKT_L_H2}>You make one call. We handle the rest.</h2>

        <div className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-5">
          {STEPS.map((step) => (
            <div key={step.n} className="relative border-t-2 border-[var(--mkt-accent)] pt-4">
              <span className="font-serif text-[13px] text-[var(--mkt-accent)]">{step.n}</span>
              <h3 className="mt-1.5 text-[15px] font-semibold text-[var(--mkt-ink)]">{step.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--mkt-ink-muted)]">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
