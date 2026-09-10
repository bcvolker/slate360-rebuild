import Link from "next/link";
import { MKT_L_BTN_GHOST, MKT_L_BTN_PRIMARY, MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";

/**
 * Homepage hero — typographic-only for now (no fabricated 3D graphic; see
 * docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §3.2/§6). This is the future
 * home of a real, interactive project viewer once a permissioned project
 * exists — but per the locked "no empty viewer chrome" rule, nothing
 * placeholder-shaped renders here until then. Sized generously (large type,
 * wider max-widths) so the single column reads as a deliberate, complete
 * composition at any viewport rather than "half a two-column layout" —
 * a narrower version of this left a visibly dead right-hand gap on wide
 * screens that read as broken, not intentional. Fixed 2026-09-10.
 */
export function HomeHeroLight() {
  return (
    <section className="pb-16 pt-20 sm:pb-24 sm:pt-28 lg:pb-28 lg:pt-32">
      <div className={MKT_L_CONTAINER}>
        <h1 className="max-w-[19ch] text-balance font-serif text-[2.5rem] font-normal leading-[1.08] text-[var(--mkt-ink)] sm:text-6xl lg:text-[4.4rem] xl:text-[4.9rem]">
          We visit the site. <em className="not-italic text-[var(--mkt-accent)]">You get the record.</em>
        </h1>
        <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-[var(--mkt-ink-muted)] sm:text-xl lg:max-w-[42ch]">
          We visit your site, capture it, and deliver an interactive record through your own
          project portal — for your team to work from, and to share with your own clients.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3.5">
          <Link href="#request-a-visit" className={`${MKT_L_BTN_PRIMARY} sm:h-14 sm:px-8 sm:text-base`}>
            Request a site visit
          </Link>
          <Link href="#how-it-works" className={`${MKT_L_BTN_GHOST} sm:h-14 sm:px-8 sm:text-base`}>
            How it works
          </Link>
        </div>
        <p className="mt-8 text-[13px] font-medium text-[var(--mkt-ink-muted)]">
          Serving the Greater Phoenix area.
        </p>
      </div>
    </section>
  );
}
