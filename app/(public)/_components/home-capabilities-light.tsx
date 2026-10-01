import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER } from "@/app/(public)/_components/marketing-styles-light";

const CAPABILITIES = [
  {
    title: "Directed 360 walkthroughs",
    body: "A guided look through the space your team can reopen after the site has changed.",
  },
  {
    title: "Drone video and photography",
    body: "Aerial stills and video of the site, planned around the work and the airspace.",
  },
  {
    title: "Gaussian splats",
    body: "An optional photoreal view for exploring a space. Portal-ready 3D is mesh-first. Splat work stays exploratory until it is actually ready to hand over.",
  },
  {
    title: "Thermal reports",
    body: "A finished condition report your team can file and share, captured with handheld equipment and delivered as a polished record.",
  },
  {
    title: "Commissioning videos",
    body: "Directed video of systems as they come online, kept with the rest of the project record.",
  },
  {
    title: "Site Walk punch lists",
    body: "The app your employees use on the job: photos, notes, and punch items tied to the project.",
  },
] as const;

export function HomeCapabilitiesLight() {
  return (
    <section id="capabilities" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-10 sm:py-12">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>What we deliver</div>
        <h2 className={MKT_L_H2}>Documentation and workflow, scoped to the job</h2>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[var(--mkt-ink-muted)]">
          You tell us what has to be on record. We capture it and put it where your team and your
          clients can use it. The example above is something you look through. The list below is
          what a project can include.
        </p>
        <div className="mt-6 grid gap-x-10 sm:grid-cols-2">
          {CAPABILITIES.map((item) => (
            <div key={item.title} className="border-t border-[var(--mkt-line)] py-4">
              <h3 className="text-[15.5px] font-semibold text-[var(--mkt-ink)]">{item.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--mkt-ink-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
