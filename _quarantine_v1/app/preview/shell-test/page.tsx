/**
 * Shell test — renders the live mobile chrome (MobileTopBar +
 * MobileInstallStrip + MobileBottomNav) plus mock dashboard content so we
 * can probe horizontal overflow at iPhone viewport WITHOUT needing auth.
 *
 * Hit /preview/shell-test (optionally with ?probe=1) to inspect.
 */

import { MobileTopBar } from "@/components/shared/MobileTopBar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { MobileInstallStrip } from "@/components/shared/MobileInstallStrip";

export const metadata = { title: "Shell test — Slate360" };

export default function ShellTest() {
  return (
    <div className="dark min-h-screen w-full max-w-full bg-background overflow-x-hidden relative">
      <MobileTopBar userName="Test User" isBetaEligible={false} />
      <MobileInstallStrip />

      <main className="w-full min-w-0 overflow-x-hidden pt-[6.25rem] pb-[88px]">
        <div className="p-4">
          <h1 className="text-2xl font-bold">Shell test</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This page renders the live mobile chrome. Add <code>?probe=1</code>
            to see overflow info (the OverflowProbe is mounted on the dashboard
            layout, not here — load this page on iPhone and pinch/swipe to
            check).
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-app bg-app-card p-4 h-24"
              >
                Card {i + 1}
              </div>
            ))}
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
