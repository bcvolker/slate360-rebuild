import Link from "next/link";
import { HeroMediaFrame } from "@/components/marketing-launchpad/MarketingMediaPanel";
import { TILE_SECTION } from "@/components/marketing-launchpad/marketing-styles";

export function MarketingHeroSection() {
  return (
    <section className={TILE_SECTION}>
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col lg:flex-row lg:items-center lg:gap-10">
        <div className="flex w-full flex-col justify-center lg:w-[40%]">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white lg:text-5xl">
            One connected app ecosystem for construction work
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#F8FAFC] lg:text-lg">
            Precision reality capture for construction workflows. Slate360 delivers native mobile
            applications engineered for high-speed field tracking alongside immersive Digital Twins.
            Capture site conditions instantly on-site; inspect structural environments inside our
            synchronized desktop workspace.
          </p>
          <p className="mt-4 max-w-xl text-xs leading-relaxed text-[#A3AED0]">
            Slate360 is primarily architected as a downloadable mobile app ecosystem for iOS and
            Android. Desktop Studio access is provided as a secondary cloud environment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-[#00E699] px-6 py-3 text-sm font-semibold tracking-tight text-[#0B0F15] transition-all hover:bg-[#00CC88] active:scale-[0.99]"
            >
              Launch Studio Workspace
            </Link>
            <Link
              href="#pricing-matrix-section"
              className="rounded-xl border border-white/[0.08] bg-slate-900/40 px-6 py-3 text-sm font-semibold tracking-tight text-[#F8FAFC] transition-all hover:border-[#00E699]/40 active:scale-[0.99]"
            >
              Review System Pricing
            </Link>
          </div>
        </div>
        <HeroMediaFrame />
      </div>
    </section>
  );
}
