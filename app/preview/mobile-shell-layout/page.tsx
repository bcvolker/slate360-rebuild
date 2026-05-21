"use client";

/**
 * Public layout harness for mobile shell geometry checks (Playwright / manual).
 * Renders production mobile primitives without auth.
 */

import type { ReactNode } from "react";

import { CommandCenterContent } from "@/components/dashboard/command-center/CommandCenterContent";
import type { Entitlements } from "@/lib/entitlements";
import { SiteWalkV1ActionGrid } from "@/components/site-walk/v1/SiteWalkV1ActionGrid";
import {
  MobileExpandableTabbedPanel,
  MobileEmptyState,
  MobileSection,
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

function MobileShellFrame({
  surface,
  children,
}: {
  surface: "app" | "site-walk";
  children: ReactNode;
}) {
  return (
    <section data-measure-surface={surface}>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        /{surface} harness
      </p>
      <div
        data-testid={`${surface}-shell-frame`}
        className="flex h-[714px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0B0F15]"
      >
        <header
          data-testid="mock-mobile-header"
          className="flex h-14 shrink-0 items-center border-b border-white/10 px-4"
        >
          <span className="text-sm font-semibold text-zinc-300">Slate360</span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        <nav
          data-testid="mock-mobile-bottom-nav"
          className="flex h-[74px] shrink-0 items-center justify-center border-t border-white/10 text-xs text-zinc-500"
        >
          Bottom nav
        </nav>
      </div>
    </section>
  );
}

export default function MobileShellLayoutPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0B0F15] text-white">
      <div className="mx-auto flex max-w-md flex-col gap-8 p-4">
        <MobileShellFrame surface="app">
          <CommandCenterContent
            entitlements={{ canAccessStandalonePunchwalk: true } as Entitlements}
            isSlateCeo
          />
        </MobileShellFrame>

        <MobileShellFrame surface="site-walk">
          <MobileExpandableTabbedPanel
            className="min-h-0 flex-1"
            tabs={mockTabs}
            defaultTab="recent"
            upper={
              <div
                className={cn(
                  "mx-auto flex w-full max-w-2xl flex-col",
                  mobileTokens.mobileShellContentStackGap,
                )}
              >
                <MobileSection showAccentLine className="shrink-0">
                  <div
                    className="flex items-center gap-2.5"
                    data-testid="site-walk-module-intro"
                  >
                    <MobileShellBackToApp />
                    <div className="min-w-0">
                      <h1 className={mobileTokens.moduleTitle}>
                        SITE <span className={mobileTokens.moduleTitleAccent}>WALK</span>
                      </h1>
                      <p className={mobileTokens.moduleSubtitle}>Field capture &amp; deliverables</p>
                    </div>
                  </div>
                </MobileSection>
                <MobileSection label="Actions" showAccentLine="cool" className="shrink-0">
                  <SiteWalkV1ActionGrid />
                </MobileSection>
              </div>
            }
          />
        </MobileShellFrame>
      </div>
    </div>
  );
}
