import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER } from "@/app/(public)/_components/marketing-styles-light";

const SERVICES = [
  {
    name: "Interactive site walkthrough",
    body: "Walk the site in the browser. Click from stop to stop, look around, and send the same link to the owner.",
    wide: true,
  },
  {
    name: "3D models",
    body: "A model of the space your team opens with the project.",
  },
  {
    name: "Gaussian splat",
    body: "Look around a photoreal view of the space. It ships when it is ready to explore.",
  },
  {
    name: "Aerial photography",
    body: "Still photos from the air, framed for the work on the ground.",
  },
  {
    name: "Aerial videography",
    body: "Video from the air, planned around the site and the airspace.",
  },
  {
    name: "Commissioning video",
    body: "Video of systems as they come online, kept with the project.",
  },
  {
    name: "Punch lists",
    body: "Photos, notes, and open items your crew adds on the job.",
  },
] as const;

export function HomePackageLight() {
  return (
    <section id="services" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-10 sm:py-12">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>Services</div>
        <h2 className={`${MKT_L_H2} max-w-[16ch]`}>Each piece of the visit, on its own.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((item) => (
            <article
              key={item.name}
              className={`rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] p-4 sm:p-5 ${"wide" in item && item.wide ? "sm:col-span-2 lg:col-span-3" : ""}`}
            >
              <span className="block h-0.5 w-8 bg-[var(--mkt-accent)]" aria-hidden />
              <h3 className="mt-3 text-[17px] font-semibold text-[var(--mkt-ink)] sm:text-[18px]">{item.name}</h3>
              <p className="mt-1.5 max-w-[62ch] text-[14.5px] leading-relaxed text-[var(--mkt-ink-muted)]">{item.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-[var(--mkt-ink-muted)]">
          <span className="font-semibold uppercase tracking-[0.06em] text-[var(--mkt-ink)]">Additional services</span>
          <span className="mx-2 text-[var(--mkt-accent)]" aria-hidden>
            »
          </span>
          Thermal report — a finished condition report, when the job calls for it.
        </p>
      </div>
    </section>
  );
}
