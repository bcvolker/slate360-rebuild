"use client";

/**
 * Public layout harness for mobile shell geometry checks (Playwright / manual).
 * Renders production mobile primitives without auth.
 */

import { CommandCenterContent } from "@/components/dashboard/command-center/CommandCenterContent";
import type { Entitlements } from "@/lib/entitlements";
import { SiteWalkV1ActionGrid } from "@/components/site-walk/v1/SiteWalkV1ActionGrid";
import {
  MobileExpandableTabbedPanel,
  MobileEmptyState,
  MobileShellBackToApp,
  mobileTokens,
} from "@/components/mobile-system";
import { cn } from "@/lib/utils";

const mockTabs = [
  {
    value: "recent",
    label: "Recent",
    content: <MobileEmptyState compact title="No recent activity" />,
  },
];

export default function MobileShellLayoutPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0B0F15] text-white">
      <div className="mx-auto flex max-w-md flex-col gap-8 p-4">
        <section data-measure-surface="app">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            /app harness
          </p>
          <div className="flex h-[700px] flex-col overflow-hidden rounded-xl border border-white/10">
            <CommandCenterContent
              entitlements={{ canAccessStandalonePunchwalk: true } as Entitlements}
              isSlateCeo
            />
          </div>
        </section>

        <section data-measure-surface="site-walk">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            /site-walk harness
          </p>
          <div className="flex h-[700px] flex-col overflow-hidden rounded-xl border border-white/10">
            <MobileExpandableTabbedPanel
              className="min-h-0 flex-1"
              tabs={mockTabs}
              defaultTab="recent"
              upper={
                <div
                  className={cn(
                    "mx-auto flex w-full max-w-2xl flex-col",
                    mobileTokens.mobileHomeContentGap,
                  )}
                >
                  <div
                    className="flex items-center gap-2.5"
                    data-testid="site-walk-module-intro"
                  >
                    <MobileShellBackToApp />
                    <div className="min-w-0">
                      <h1 className={mobileTokens.moduleTitle}>SITE WALK</h1>
                      <p className={mobileTokens.moduleSubtitle}>Field capture &amp; deliverables</p>
                    </div>
                  </div>
                  <SiteWalkV1ActionGrid />
                </div>
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
