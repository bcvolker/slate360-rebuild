import Link from "next/link";
import Image from "next/image";
import { HeroMediaFrame } from "@/components/marketing-launchpad/MarketingExpandableMediaFrame";
import { BODY_COPY, TEXT_COLUMN, TILE_ROW, TILE_SECTION_SNAP } from "@/components/marketing-launchpad/marketing-styles";

export function MarketingHeroSection() {
  return (
    <section className={TILE_SECTION_SNAP}>
      <div className={TILE_ROW}>
        <div className={`${TEXT_COLUMN} order-1`}>
          <div className="mb-6 flex w-auto flex-row items-center gap-5">
            <Link href="/install" aria-label="Download on the App Store">
              <Image
                src="/uploads/app-store-badge.svg"
                alt=""
                width={140}
                height={40}
                className="h-10 w-auto transform transition hover:scale-[1.02] active:scale-[0.99]"
              />
            </Link>
            <Link href="/install" aria-label="Get it on Google Play">
              <Image
                src="/uploads/google-play-badge.svg"
                alt=""
                width={158}
                height={40}
                className="h-10 w-auto transform transition hover:scale-[1.02] active:scale-[0.99]"
              />
            </Link>
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white lg:text-5xl">
            SLATE360 // REALITY INTELLIGENCE
          </h1>
          <p className={BODY_COPY}>
            One connected native app ecosystem engineered for precision construction workflows. Capture
            high-fidelity structural data instantly in the field using our native mobile capture engines;
            inspect, measure, and analyze full spatial environments inside your synchronized cloud desktop
            studio.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="#pricing-matrix-section"
              className="rounded-xl border border-white/[0.08] bg-slate-900/40 px-6 py-3 text-sm font-semibold tracking-tight text-[#F8FAFC] transition-all hover:border-[#00E699]/40 active:scale-[0.99]"
            >
              Review System Pricing
            </Link>
          </div>
        </div>
        <div className="order-2 w-full">
          <HeroMediaFrame />
        </div>
      </div>
    </section>
  );
}
