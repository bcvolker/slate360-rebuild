"use client";

import { CreatorHome } from "@/components/product-shell/CreatorHome";
import { DashboardDesktopSidebar } from "@/components/dashboard-desktop/DashboardDesktopSidebar";
import { DashboardDesktopTopBar } from "@/components/dashboard-desktop/DashboardDesktopTopBar";
import { dashboardDesktopTokens as t } from "@/components/dashboard-desktop/dashboard-tokens";

const HERO =
  "/api/spatial-walkthrough/public/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269/media?clip=f278d37f-1c2f-4511-aef5-437b3992d39d&kind=hero";

export default function CreatorHomePreview() {
  return (
    <div className={`flex h-[100dvh] ${t.canvas}`} data-testid="creator-home-preview">
      <DashboardDesktopSidebar
        visibleApps={["spatial-walkthrough", "site-walk", "twin360", "slatedrop"]}
      />
      <div className={t.main}>
        <DashboardDesktopTopBar
          userName="Brian Volker"
          shellApp="dashboard"
          twinVisible
          onOpenCommand={() => undefined}
        />
        <main className={t.content}>
          <CreatorHome
            recentProjects={[
              { id: "1", name: "AOB205 — ASU", status: "active", createdAt: "2026-08-30T00:00:00.000Z", imageUrl: HERO },
            ]}
            recentWalks={[{ id: "w1", title: "HouseWalk", status: "ready", updatedAt: "2026-08-30T00:00:00.000Z" }]}
            needsAttention={[{ id: "a1", title: "Kitchen spec needs reply", message: "", linkPath: "/portal/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269", createdAt: "2026-08-30T00:00:00.000Z" }]}
          />
        </main>
      </div>
    </div>
  );
}
