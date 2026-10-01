import Link from "next/link";
import { MKT_L_BTN_GHOST, MKT_L_BTN_PRIMARY, MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";

export function HomeHeroLight() {
  return (
    <section className="pb-3 pt-6 sm:pb-4 sm:pt-8">
      <div className={MKT_L_CONTAINER}>
        <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)]">
          Serving the greater Phoenix area
        </p>
        <h1 className="mt-2 max-w-[18ch] text-balance font-serif text-[2.15rem] font-normal leading-[1.06] text-[var(--mkt-ink)] sm:text-5xl lg:text-[3.15rem]">
          Document the job. Share a link <em className="not-italic text-[var(--mkt-accent)]">the crew can use.</em>
        </h1>
        <p className="mt-3 max-w-[42ch] text-[15.5px] leading-snug text-[var(--mkt-ink-muted)] sm:text-[16.5px]">
          We visit the site and publish an interactive walkthrough your team can walk in the browser.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="#request-a-visit" className={MKT_L_BTN_PRIMARY}>
            Request a site visit
          </Link>
          <Link href="#walk" className={MKT_L_BTN_GHOST}>
            Walk the site
          </Link>
        </div>
      </div>
    </section>
  );
}
