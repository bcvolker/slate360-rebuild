import {
  MKT_L_CONTAINER,
  MKT_L_H2,
  MKT_L_KICKER,
  MKT_L_LEDE,
} from "@/app/(public)/_components/marketing-styles-light";

const LAYERS = [
  {
    who: "You receive",
    title: "The record",
    items: ["Interactive records, per capture date", "Floor plans and exports", "Source capture archive, retained"],
  },
  {
    who: "In your portal",
    title: "Control",
    items: [
      "Every version in one timeline",
      "Open, review, pin, and annotate",
      "Download export packages",
      "Compose share links — scoped, expiring, view-limited",
    ],
  },
  {
    who: "Your clients get",
    title: "A link that just opens",
    items: ["Your branding, not ours", "Opens in any browser — no app, no account", "Share your screen on any call and walk the site together"],
  },
] as const;

/**
 * Client portal — co-focal with "What you get" per the locked hierarchy.
 * The preview slot below accepts either a still image or a short screen
 * recording once Brian has one — see docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md.
 * Never fabricated; stays a clean placeholder frame until real content exists.
 */
export function HomePortalLight() {
  return (
    <section id="portal" className="py-16 sm:py-20 lg:py-24">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>Your client portal</div>
        <h2 className={MKT_L_H2}>
          Delivered to a portal. Shared under <em className="not-italic text-[var(--mkt-accent)]">your</em> brand.
        </h2>
        <p className={MKT_L_LEDE}>
          Your project record lives in a portal built for handing off — open any version, download
          exports, and pass deliverables to your own clients to keep them informed as the work moves.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
          {LAYERS.map((layer) => (
            <div key={layer.title} className="border-t border-[var(--mkt-line)] pt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--mkt-accent)]">
                {layer.who}
              </div>
              <h3 className="mt-2 font-serif text-xl font-normal text-[var(--mkt-ink)]">{layer.title}</h3>
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

        {/* Preview slot — replace with a real screenshot or a short screen
            recording of a real project being managed once one exists. */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] shadow-[0_20px_50px_-24px_rgba(26,36,51,0.18)]">
          <div className="flex items-center gap-2 border-b border-[var(--mkt-line)] px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--mkt-line)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--mkt-line)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--mkt-line)]" />
            <span className="ml-2 text-[11.5px] text-[var(--mkt-ink-muted)]">portal.slate360.ai</span>
          </div>
          <div className="flex aspect-video items-center justify-center bg-[var(--mkt-canvas-alt)] px-6 text-center">
            <p className="max-w-sm text-sm text-[var(--mkt-ink-muted)]">
              A look at the portal — reviewing, pinning, and sharing a project.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
