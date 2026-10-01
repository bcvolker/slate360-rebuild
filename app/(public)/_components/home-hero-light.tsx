import Link from "next/link";
import { MKT_L_BTN_GHOST, MKT_L_BTN_PRIMARY, MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";
import { HomeExampleViewer } from "@/app/(public)/_components/home-example-viewer";

export function HomeHeroLight() {
  return (
    <section className="pb-8 pt-6 sm:pb-10 sm:pt-8 lg:pb-12 lg:pt-10">
      <div className={MKT_L_CONTAINER}>
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)]">
              East Valley, Phoenix
            </p>
            <h1 className="mt-3 max-w-[18ch] text-balance font-serif text-[2rem] font-normal leading-[1.12] text-[var(--mkt-ink)] sm:text-[2.6rem] lg:text-[2.9rem]">
              Document the site. <em className="not-italic text-[var(--mkt-accent)]">Run the project from it.</em>
            </h1>
            <p className="mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-[var(--mkt-ink-muted)] sm:text-[16.5px]">
              We visit the job and hand you directed 360 walkthroughs, drone photo and video,
              commissioning video, and thermal reports. Your crew runs punch lists in Site Walk.
              Clients open a portal with your branding, your documents, and the project in one place.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="#request-a-visit" className={MKT_L_BTN_PRIMARY}>
                Request a site visit
              </Link>
              <Link href="#capabilities" className={MKT_L_BTN_GHOST}>
                What we deliver
              </Link>
            </div>
          </div>
          <HomeExampleViewer />
        </div>
      </div>
    </section>
  );
}
