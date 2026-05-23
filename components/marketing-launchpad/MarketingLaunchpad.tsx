"use client";

import Link from "next/link";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { HeroModelViewer } from "@/components/marketing-launchpad/HeroModelViewer";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "Sign In", href: "/login" },
] as const;

export function MarketingLaunchpad() {
  return (
    <div className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll scroll-smooth bg-[#0B0F15]">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/[0.05] bg-[#0B0F15]/70 px-6 backdrop-blur-xl">
        <Link href="/" aria-label="Slate360 home">
          <Slate360Logo variant="dark" />
        </Link>
        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <section
        id="product"
        className="relative flex h-[100dvh] w-full snap-start scroll-snapped-transform transition-all duration-700 ease-in-out"
      >
        <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col px-6 pb-8 pt-24 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex w-full flex-col justify-center lg:w-[40%]">
            <h1 className="text-2xl font-semibold tracking-[0.08em] text-[#FFFFFF] sm:text-3xl">
              SLATE360 // REALITY INTELLIGENCE
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#F8FAFC] sm:text-lg">
              Precision reality capture for construction workflows. Capture site conditions instantly with
              Site Walk; inspect structural environments with interactive Digital Twins.
            </p>
          </div>

          <div className="flex w-full flex-1 items-center justify-center p-8 lg:w-[60%]">
            <HeroModelViewer />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-4 px-6 pb-8 pt-4">
          <Link
            href="/login"
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-6 py-3.5 font-medium tracking-tight text-slate-200 transition-all hover:bg-white/[0.04] active:scale-[0.99]"
          >
            Launch Studio Workspace
          </Link>
          <Link
            href="#pricing"
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-6 py-3.5 font-medium tracking-tight text-slate-200 transition-all hover:bg-white/[0.04] active:scale-[0.99]"
          >
            Review System Pricing
          </Link>
        </div>
      </section>

      <section
        id="pricing"
        className="flex h-[100dvh] w-full snap-start items-center justify-center px-6"
      >
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-[#FFFFFF]">Site Walk Pro Seat</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#F8FAFC]">
              Site Walk Pro Seat // $108 per month billed annually. Includes mobile camera capture,
              automated vector markups, blueprint pin drop maps, and synchronous PDF deliverable log
              outputs.
            </p>
          </article>
          <article className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-[#FFFFFF]">Enterprise Twin Suite</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#F8FAFC]">
              Enterprise Twin Suite // Custom volume pricing. Unlocks advanced 3D photogrammetry
              processing channels, tripod LiDAR point-cloud rendering spaces, and unlimited organizational
              collaborator seats.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
