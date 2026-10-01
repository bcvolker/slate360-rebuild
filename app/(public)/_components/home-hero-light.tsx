import Link from "next/link";
import { MKT_L_BTN_GHOST, MKT_L_BTN_PRIMARY, MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";

export function HomeHeroLight() {
  return (
    <section className="pb-6 pt-8 sm:pb-8 sm:pt-10">
      <div className={MKT_L_CONTAINER}>
        <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)]">East Valley, Phoenix</p>
        <h1 className="mt-3 max-w-[16ch] text-balance font-serif text-[2.15rem] font-normal leading-[1.08] text-[var(--mkt-ink)] sm:text-5xl lg:text-[3.35rem]">
          Leave the site with a portal <em className="not-italic text-[var(--mkt-accent)]">your crew can use.</em>
        </h1>
        <p className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-[var(--mkt-ink-muted)] sm:text-[17px]">
          We capture the job locally and publish a directed walkthrough your team moves through.
          Scope drone photo and video, a finished thermal report, or commissioning video when the
          work needs them. Punch lists, documents, and questions stay on that same record. Your
          clients open your brand.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="#request-a-visit" className={MKT_L_BTN_PRIMARY}>
            Request a site visit
          </Link>
          <Link href="#walk" className={MKT_L_BTN_GHOST}>
            Try the walk
          </Link>
        </div>
      </div>
    </section>
  );
}
