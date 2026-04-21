/**
 * Dashboard test — same components as the real /dashboard but without
 * auth so we can probe horizontal overflow at iPhone viewport.
 */

import { MobileTopBar } from "@/components/shared/MobileTopBar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { MobileInstallStrip } from "@/components/shared/MobileInstallStrip";
import WalledGardenDashboard from "@/components/walled-garden-dashboard";

export const metadata = { title: "Dashboard test — Slate360" };

export default function DashboardTest() {
  return (
    <div className="dark min-h-screen w-full max-w-full bg-background overflow-x-hidden relative">
      <MobileTopBar userName="Test User" isBetaEligible={false} />
      <MobileInstallStrip />

      <main className="w-full min-w-0 overflow-x-hidden pt-[6.25rem] pb-[88px]">
        <WalledGardenDashboard
          userName="Test User"
          orgName="Test Org"
          storageLimitGb={5}
          entitlements={null}
        />
      </main>

      <MobileBottomNav />
    </div>
  );
}
