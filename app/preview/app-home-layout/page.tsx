"use client";

/**
 * Public harness for /app home layout checks (Playwright / manual).
 * Renders production home content without auth using mocked launcher lists.
 */

import { InviteShareProvider } from "@/components/shared/InviteShareProvider";
import { MobileShell } from "@/components/mobile-system";
import { MobileAppRootContent } from "@/components/studio-ui/MobileAppRootContent";
import type { MobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import type { MobileLauncherAppView } from "@/lib/mobile/mobile-launcher-app-types";

const MOCK_HOME_DATA: MobileAppHomeData = {
  recentWalks: [
    { id: "w1", title: "Level 2 walkthrough", createdAt: new Date().toISOString() },
    { id: "w2", title: "Roof inspection", createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  recentDeliverables: [],
  recentSlateDrop: [
    {
      id: "f1",
      filename: "north-elevation.jpg",
      status: "completed",
      createdAt: new Date().toISOString(),
    },
  ],
  processingQueue: [],
  alerts: [],
  assignments: [],
  hubSummary: {
    openItems: 2,
    needsReview: 0,
    draftDeliverables: 0,
    unsyncedItems: 0,
  },
};

function mockApp(
  id: string,
  title: string,
  accent: "primary" | "info",
  statusSubline: string,
): MobileLauncherAppView {
  return {
    id,
    title,
    subtext: "",
    statusSubline,
    href: `/${id}`,
    accent,
    access: "entitled",
    entitlementKey: id,
    upsellBullets: ["One", "Two", "Three"],
  };
}

const APPS_3: MobileLauncherAppView[] = [
  mockApp("site-walk", "Site Walk", "primary", "3 walks this week · 2 open items"),
  mockApp("twin-360", "Twin 360", "info", "1 twin processing · ~12 min left"),
  mockApp("slatedrop", "SlateDrop", "primary", "2 recent uploads"),
];

const APPS_5: MobileLauncherAppView[] = [
  ...APPS_3,
  mockApp("360-tours", "360 Tours", "info", "Ready to publish"),
  mockApp("design-studio", "Design Studio", "info", "Ready when you are"),
];

function HarnessFrame({
  label,
  apps,
}: {
  label: string;
  apps: MobileLauncherAppView[];
}) {
  return (
    <section data-measure-surface="app-home" data-launcher-count={apps.length}>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8B97A6]">
        {label}
      </p>
      <div
        data-testid={`app-home-frame-${apps.length}`}
        className="flex h-[844px] w-[390px] flex-col overflow-hidden rounded-xl border border-[#2A3340] bg-[#0B0F15]"
      >
        <header
          data-testid="mock-mobile-header"
          className="flex h-11 shrink-0 items-center border-b border-[#2A3340] px-3"
        >
          <span className="text-sm font-semibold text-white">Slate360</span>
        </header>
        <InviteShareProvider>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <MobileShell
              mobileRoute="app"
              className="!h-full min-h-0 flex-1"
              scroll={
                <MobileAppRootContent homeData={MOCK_HOME_DATA} launcherApps={apps} />
              }
              bottomNav={
                <nav
                  data-testid="mock-mobile-bottom-nav"
                  className="flex h-[62px] shrink-0 items-center justify-center border-t border-[#2A3340] text-xs text-[#6B7889]"
                >
                  Bottom nav
                </nav>
              }
            />
          </div>
        </InviteShareProvider>
      </div>
    </section>
  );
}

export default function AppHomeLayoutPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0B0F15] p-4 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <HarnessFrame label="3-app launcher matrix" apps={APPS_3} />
        <HarnessFrame label="5-app launcher matrix" apps={APPS_5} />
      </div>
    </div>
  );
}
