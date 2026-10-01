import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER } from "@/app/(public)/_components/marketing-styles-light";

const PACKAGE = [
  { title: "Directed 360 walkthrough", body: "A path through the space. You move by stop and look around, then reopen it after the site has changed." },
  { title: "Drone video and photography", body: "Aerial stills and video, planned around the work and the airspace." },
  { title: "Thermal report", body: "A finished condition report to file and share. Handheld capture, delivered as a record." },
  { title: "Commissioning video", body: "Directed video of systems as they come online, kept with the project." },
  { title: "Site Walk punch lists", body: "The app your employees use on the job: photos, notes, and punch items on the project." },
  { title: "Gaussian splat, optional", body: "An exploratory photoreal view when you want to look around a model. Portal-ready 3D is mesh-first. A splat ships only when it is ready to hand over." },
] as const;

export function HomePackageLight() {
  return (
    <section id="package" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-10 sm:py-12">
      <div className={`${MKT_L_CONTAINER} grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12`}>
        <div>
          <div className={MKT_L_KICKER}>The package</div>
          <h2 className={MKT_L_H2}>Scoped to the job in front of you</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--mkt-ink-muted)]">
            Tell us which records the project needs. We capture them on the visit and put them in
            the portal. A custom quote covers that scope, billed on a purchase order or a monthly invoice.
          </p>
        </div>
        <div>
          {PACKAGE.map((item) => (
            <div key={item.title} className="border-t border-[var(--mkt-line)] py-3.5">
              <h3 className="text-[15.5px] font-semibold text-[var(--mkt-ink)]">{item.title}</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--mkt-ink-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
