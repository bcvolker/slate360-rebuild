"use client";

import { useState } from "react";
import { DashboardDesktopSidebar } from "@/components/dashboard-desktop/DashboardDesktopSidebar";
import { DashboardDesktopTopBar } from "@/components/dashboard-desktop/DashboardDesktopTopBar";
import { DashboardHomeContent } from "@/components/dashboard-desktop/DashboardHomeContent";
import { dashboardDesktopTokens as t } from "@/components/dashboard-desktop/dashboard-tokens";

const COUNTS = { projects: 12, siteWalks: 34, digitalTwins: 5 };
const PROJECTS = Array.from({ length: 6 }, (_, i) => ({
  id: String(i),
  name: `Oak Ridge Roof Inspection ${i + 1}`,
  status: "active",
  createdAt: new Date().toISOString(),
}));
const WALKS = Array.from({ length: 4 }, (_, i) => ({
  id: String(i),
  title: `Walk ${i + 1}`,
  status: "complete",
  updatedAt: new Date().toISOString(),
}));

export default function DashboardLookPreview() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`flex h-[100dvh] ${t.canvas}`}>
      <DashboardDesktopSidebar
        showOpsConsole
        isCeo
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className={t.main}>
        <DashboardDesktopTopBar userName="Brian Volker" />
        <main className={t.content}>
          <DashboardHomeContent
            workspaceName="Slate360 Workspace"
            counts={COUNTS}
            recentProjects={PROJECTS}
            recentWalks={WALKS}
          />
        </main>
      </div>
    </div>
  );
}
