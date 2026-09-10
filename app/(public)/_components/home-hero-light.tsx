import Link from "next/link";
import { MKT_L_BTN_GHOST, MKT_L_BTN_PRIMARY, MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";

/**
 * Homepage hero — typographic-only for now (no fabricated 3D graphic; see
 * docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §3.2/§6). A real photo can be
 * added later without restructuring — this section is intentionally compact,
 * not a huge empty visual area.
 */
export function HomeHeroLight() {
  return (
    <section className="pb-14 pt-16 sm:pb-20 sm:pt-24 lg:pb-24 lg:pt-28">
      <div className={MKT_L_CONTAINER}>
        <h1 className="max-w-[15ch] text-balance font-serif text-[2.35rem] font-normal leading-[1.08] text-[var(--mkt-ink)] sm:text-5xl lg:text-[3.4rem]">
          We visit the site. <em className="not-italic text-[var(--mkt-accent)]">You get the record.</em>
        </h1>
        <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-[var(--mkt-ink-muted)] sm:text-lg">
          We visit your site, capture it, and deliver an interactive record through your own
          project portal — for your team to work from, and to share with your own clients.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3.5">
          <Link href="#request-a-visit" className={MKT_L_BTN_PRIMARY}>
            Request a site visit
          </Link>
          <Link href="#how-it-works" className={MKT_L_BTN_GHOST}>
            How it works
          </Link>
        </div>
        <p className="mt-7 text-[13px] font-medium text-[var(--mkt-ink-muted)]">
          Serving the Greater Phoenix area.
        </p>
      </div>
    </section>
  );
}
