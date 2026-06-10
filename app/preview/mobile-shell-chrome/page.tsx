"use client";

/**
 * Public harness for neutral mobile shell chrome (S1) — header + bottom nav geometry.
 * Renders production MobilePlatformHeader + MobilePlatformBottomNav without auth.
 */

import {
  MobilePlatformBottomNav,
  MobilePlatformHeader,
  MobileShell,
} from "@/components/mobile-system";
import type { ModuleHomeBrand } from "@/components/mobile-system/mainMobileTabs";
import { AppWindow, Camera } from "lucide-react";

const MODULE_BRANDS: Record<string, ModuleHomeBrand> = {
  "site-walk": { name: "Site Walk", icon: Camera, accent: "primary" },
  "digital-twin": { name: "Twin 360", icon: AppWindow, accent: "info" },
};

function ChromeFrame({
  surface,
  moduleHomeBrand,
}: {
  surface: string;
  moduleHomeBrand?: ModuleHomeBrand | null;
}) {
  return (
    <section data-measure-surface={surface} className="inline-block">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8B97A6]">
        {surface}
      </p>
      <div className="flex h-[844px] w-[390px] flex-col overflow-hidden rounded-xl border border-[#2A3340] bg-[#0B0F15]">
        <MobileShell
          mobileRoute={surface === "app" ? "app" : (surface as "site-walk" | "digital-twin")}
          header={<MobilePlatformHeader moduleHomeBrand={moduleHomeBrand} />}
          bottomNav={<MobilePlatformBottomNav />}
        >
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-[#6B7889]">
            {surface} content
          </div>
        </MobileShell>
      </div>
    </section>
  );
}

export default function MobileShellChromePreviewPage() {
  return (
    <main className="min-h-screen bg-[#0B0F15] p-6">
      <h1 className="mb-6 text-lg font-semibold text-white">Mobile shell chrome S1</h1>
      <div className="flex flex-wrap gap-8">
        <ChromeFrame surface="app" />
        <ChromeFrame surface="site-walk" moduleHomeBrand={MODULE_BRANDS["site-walk"]} />
        <ChromeFrame surface="digital-twin" moduleHomeBrand={MODULE_BRANDS["digital-twin"]} />
      </div>
    </main>
  );
}
