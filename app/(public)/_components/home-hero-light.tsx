import Link from "next/link";
import { MKT_L_BTN_GHOST, MKT_L_BTN_PRIMARY, MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";
import { HeroViewerPanel } from "@/app/(public)/_components/home-hero-viewer-panel";

/**
 * Homepage hero — two columns on desktop: pitch text left, a viewer-shaped
 * placeholder right (see home-hero-viewer-panel.tsx) that will hold a real
 * interactive project example once one is permissioned. Stacks to a single
 * column on mobile/tablet, text first. Sized so the two columns balance —
 * a single-column, text-only version of this left a visibly dead gap on
 * wide screens; adding the panel meant trimming the headline scale slightly
 * so it doesn't overpower the narrower column. See
 * docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §3.2/§6 and 2026-09-10 addenda.
 */
export function HomeHeroLight() {
  return (
    <section className="pb-16 pt-20 sm:pb-24 sm:pt-28 lg:pb-28 lg:pt-32">
      <div className={MKT_L_CONTAINER}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <h1 className="max-w-[16ch] text-balance font-serif text-[2.25rem] font-normal leading-[1.1] text-[var(--mkt-ink)] sm:text-5xl lg:text-[3.4rem] xl:text-[3.75rem]">
              We visit the site. <em className="not-italic text-[var(--mkt-accent)]">You get the record.</em>
            </h1>
            <p className="mt-6 max-w-[42ch] text-[16px] leading-relaxed text-[var(--mkt-ink-muted)] sm:text-lg">
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

          <HeroViewerPanel />
        </div>
      </div>
    </section>
  );
}
