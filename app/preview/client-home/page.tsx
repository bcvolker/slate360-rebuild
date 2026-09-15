"use client";

import { useState } from "react";
import { DashboardDesktopSidebar } from "@/components/dashboard-desktop/DashboardDesktopSidebar";
import { DashboardDesktopTopBar } from "@/components/dashboard-desktop/DashboardDesktopTopBar";
import { ClientHomeContent } from "@/components/dashboard-desktop/ClientHomeContent";
import { dashboardDesktopTokens as t } from "@/components/dashboard-desktop/dashboard-tokens";

const PROJECTS = Array.from({ length: 5 }, (_, i) => ({
  id: String(i),
  name: `Oak Ridge Roof Inspection ${i + 1}`,
  status: "active",
  createdAt: new Date(Date.now() - 86400000 * (i * 6 + 2)).toISOString(),
  imageUrl: `https://picsum.photos/seed/client-home-${i}/900/500`,
  isFixture: false,
}));

export default function ClientHomePreview() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`flex h-[100dvh] ${t.canvas}`}>
      <DashboardDesktopSidebar
        showOpsConsole={false}
        isCeo={false}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className={t.main}>
        <DashboardDesktopTopBar
          userName="Contractor Client"
          shellApp="dashboard"
          twinVisible={false}
          onOpenCommand={() => {}}
        />
        <main className={t.content}>
          <ClientHomeContent projects={PROJECTS} />
        </main>
      </div>
    </div>
  );
}
