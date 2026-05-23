import Link from "next/link";
import Image from "next/image";
import { HeroMediaFrame } from "@/components/marketing-launchpad/MarketingExpandableMediaFrame";
import { APP_STORE_BTN, BODY_COPY, TEXT_COLUMN, TILE_ROW, TILE_SECTION } from "@/components/marketing-launchpad/marketing-styles";

export function MarketingHeroSection() {
  return (
    <section className={TILE_SECTION}>
      <div className={TILE_ROW}>
        <div className={`${TEXT_COLUMN} order-1`}>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white lg:text-5xl">
            SLATE360 // REALITY INTELLIGENCE
          </h1>
          <p className={BODY_COPY}>
            Precision reality capture for construction workflows. Capture site conditions instantly with
            Site Walk; inspect structural environments with interactive Digital Twins.
          </p>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:mb-0 lg:mt-8">
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-xl bg-[#00E699] px-6 py-4 text-sm font-semibold tracking-tight text-[#0B0F15] transition-all hover:bg-[#00CC88] active:scale-[0.99] sm:w-auto"
            >
              Launch Studio Workspace
            </Link>
            <Link href="/install" className={APP_STORE_BTN} aria-label="Download on the App Store">
              <Image src="/uploads/app-store-badge.svg" alt="" width={120} height={36} className="h-9 w-auto" />
            </Link>
            <Link href="/install" className={APP_STORE_BTN} aria-label="Get it on Google Play">
              <Image src="/uploads/google-play-badge.svg" alt="" width={135} height={36} className="h-9 w-auto" />
            </Link>
          </div>
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
