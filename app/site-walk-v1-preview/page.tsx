"use client";

import { useState } from "react";
import { SiteWalkV1Shell } from "@/components/site-walk/v1/SiteWalkV1Shell";
import { SiteWalkV1ActionGrid } from "@/components/site-walk/v1/SiteWalkV1ActionGrid";
import { SiteWalkV1ListPanel } from "@/components/site-walk/v1/SiteWalkV1ListPanel";
import { WorksiteV1Row } from "@/components/site-walk/v1/WorksiteV1Row";
import { WalkV1Row } from "@/components/site-walk/v1/WalkV1Row";
import { ReportV1Row } from "@/components/site-walk/v1/ReportV1Row";
import { PlanWorkspaceV1Skeleton } from "@/components/site-walk/v1/PlanWorkspaceV1Skeleton";
import { CaptureWorkspaceV1Skeleton } from "@/components/site-walk/v1/CaptureWorkspaceV1Skeleton";
import type { V1NavTab } from "@/components/site-walk/v1/SiteWalkV1BottomNav";
import { Button } from "@/components/ui/button";
import { Settings, MessageSquare, HelpCircle, User, FolderOpen } from "lucide-react";

type PreviewScreen = "shell" | "plan" | "capture";

export default function SiteWalkV1PreviewPage() {
  const [tab, setTab] = useState<V1NavTab>("home");
  const [screen, setScreen] = useState<PreviewScreen>("shell");

  if (screen === "plan") {
    return (
      <PlanWorkspaceV1Skeleton
        worksiteName="Main Building"
        walkTitle="Foundation Inspection"
        onBack={() => setScreen("shell")}
      />
    );
  }

  if (screen === "capture") {
    return (
      <CaptureWorkspaceV1Skeleton
        onBack={() => setScreen("plan")}
        onStopContext={() => {}}
        onExit={() => setScreen("shell")}
      />
    );
  }

  return (
    <SiteWalkV1Shell
      title={shellTitle(tab)}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "home" && (
        <HomeView
          onOpenPlan={() => setScreen("plan")}
          onOpenCapture={() => setScreen("capture")}
        />
      )}
      {tab === "worksites" && <WorksitesView onOpenPlan={() => setScreen("plan")} />}
      {tab === "reports" && <ReportsView />}
      {tab === "account" && <AccountView />}
    </SiteWalkV1Shell>
  );
}

function shellTitle(tab: V1NavTab): string {
  switch (tab) {
    case "home":
      return "Site Walk";
    case "worksites":
      return "Worksites";
    case "reports":
      return "Reports";
    case "account":
      return "Account";
  }
}

/* ---------- Home ---------- */

function HomeView({
  onOpenPlan,
  onOpenCapture,
}: {
  onOpenPlan: () => void;
  onOpenCapture: () => void;
}) {
  return (
    <>
      <SiteWalkV1ActionGrid
        onNewWorksite={() => {}}
        onStartWalk={() => {}}
        onQuickCapture={onOpenCapture}
      />
      <SiteWalkV1ListPanel
        activeContent={<EmptyList message="No active walks" />}
        recentContent={<EmptyList message="No recent walks" />}
        worksitesContent={<EmptyList message="No worksites yet" />}
        issuesContent={<EmptyList message="No open issues" />}
      />
    </>
  );
}

/* ---------- Worksites ---------- */

function WorksitesView({ onOpenPlan }: { onOpenPlan: () => void }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <EmptyList message="No worksites yet. Create a worksite to get started." />
    </div>
  );
}

/* ---------- Reports ---------- */

function ReportsView() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <EmptyList message="No reports yet. Complete a walk to create a report." />
    </div>
  );
}

/* ---------- Account ---------- */

function AccountView() {
  const items = [
    { icon: FolderOpen, label: "SlateDrop" },
    { icon: Settings, label: "Settings" },
    { icon: MessageSquare, label: "Feedback" },
    { icon: HelpCircle, label: "Help" },
    { icon: User, label: "Account" },
  ];

  return (
    <div className="flex flex-col gap-1 p-4">
      {items.map(({ icon: Icon, label }) => (
        <button
          key={label}
          type="button"
          className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5"
        >
          <Icon className="size-5 text-zinc-500" />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Shared empty state ---------- */

function EmptyList({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-zinc-600">{message}</p>
    </div>
  );
}
