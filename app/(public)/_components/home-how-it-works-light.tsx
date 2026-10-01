import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER } from "@/app/(public)/_components/marketing-styles-light";

const STEPS = [
  { n: "01", title: "Tell us the job", body: "Site, what needs to be on record, and when you need us there." },
  { n: "02", title: "We visit", body: "We come to the job and capture it on site, planned around your schedule." },
  { n: "03", title: "Deliverables", body: "Walkthroughs, video, photos, and reports are reviewed and published." },
  { n: "04", title: "Your portal", body: "The project, the documents, and your branding, in one place." },
  { n: "05", title: "Your crew and clients", body: "Employees work punch lists in Site Walk. Clients open a link." },
] as const;

export function HomeHowItWorksLight() {
  return (
    <section id="how-it-works" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-10 sm:py-12">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>How it works</div>
        <h2 className={MKT_L_H2}>You call. We document the site.</h2>

        <div className="mt-6 grid gap-x-6 gap-y-6 sm:grid-cols-5">
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
