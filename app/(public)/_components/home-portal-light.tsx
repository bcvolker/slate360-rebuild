import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER, MKT_L_LEDE } from "@/app/(public)/_components/marketing-styles-light";

const LAYERS = [
  {
    who: "Project management",
    title: "The job in one place",
    items: [
      "Visits and deliverables on one timeline",
      "Punch items and follow-ups your team can track",
      "A link that opens in the browser",
    ],
  },
  {
    who: "Document management",
    title: "Files with the work they describe",
    items: [
      "Plans, submittals, and reports kept with the project",
      "Pinned to the spot in the record they belong to",
      "Ready to download when you need to send them on",
    ],
  },
  {
    who: "White-label branding",
    title: "Your name on what clients open",
    items: [
      "Your logo and colors carry through the portal",
      "Clients see your project",
      "Links you can scope and expire",
    ],
  },
] as const;

export function HomePortalLight() {
  return (
    <section id="portal" className="py-10 sm:py-12">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>Client portal</div>
        <h2 className={MKT_L_H2}>
          One portal for the project, the documents, and <em className="not-italic text-[var(--mkt-accent)]">your</em> brand.
        </h2>
        <p className={MKT_L_LEDE}>
          Walkthroughs, video, reports, and files live together. Your crew works from it. Your
          clients open a link and see your branding.
        </p>
        <div className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-8">
          {LAYERS.map((layer) => (
            <div key={layer.title} className="border-t border-[var(--mkt-line)] pt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--mkt-accent)]">
                {layer.who}
              </div>
              <h3 className="mt-1.5 font-serif text-xl font-normal text-[var(--mkt-ink)]">{layer.title}</h3>
              <ul className="mt-3 space-y-1.5">
                {layer.items.map((item) => (
                  <li key={item} className="relative pl-4 text-[14px] leading-relaxed text-[var(--mkt-ink-muted)]">
                    <span className="absolute left-0 top-[0.65em] h-px w-2.5 bg-[var(--mkt-accent)]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
