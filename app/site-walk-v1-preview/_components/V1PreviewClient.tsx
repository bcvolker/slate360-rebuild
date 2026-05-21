"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteWalkV1Shell } from "@/components/site-walk/v1/SiteWalkV1Shell";
import { PlanWorkspaceV1Skeleton } from "@/components/site-walk/v1/PlanWorkspaceV1Skeleton";
import { CaptureWorkspaceV1Skeleton } from "@/components/site-walk/v1/CaptureWorkspaceV1Skeleton";
import type { V1NavTab } from "@/components/site-walk/v1/SiteWalkV1BottomNav";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import { HomeView } from "@/components/site-walk/v1/views/HomeView";
import { WorksitesView } from "@/components/site-walk/v1/views/WorksitesView";
import { SlateDropView } from "@/components/site-walk/v1/views/SlateDropView";
import { CoordinationView } from "@/components/site-walk/v1/views/CoordinationView";
import { DeliverablesView } from "@/components/site-walk/v1/views/DeliverablesView";

type Props = {
  orgName: string | null;
  userInitial: string;
  isAdmin: boolean;
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
};

type PreviewScreen = "shell" | "plan" | "capture";

export function V1PreviewClient({
  orgName,
  userInitial,
  isAdmin,
  projects,
  walks,
  summary,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<V1NavTab>("home");
  const [screen, setScreen] = useState<PreviewScreen>("shell");

  if (screen === "plan") {
    return (
      <PlanWorkspaceV1Skeleton
        worksiteName="Plan Preview"
        walkTitle="(read-only skeleton)"
        onBack={() => setScreen("shell")}
      />
    );
  }
  if (screen === "capture") {
    return (
      <CaptureWorkspaceV1Skeleton
        onBack={() => setScreen("plan")}
        onExit={() => setScreen("shell")}
      />
    );
  }

  const title = shellTitle(tab, orgName);

  return (
    <SiteWalkV1Shell title={title} activeTab={tab} onTabChange={setTab}>
      {tab === "home" && (
        <HomeView
          walks={walks}
          projects={projects}
          summary={summary}
          router={router}
          setTab={setTab}
        />
      )}
      {tab === "worksites" && (
        <WorksitesView projects={projects} walks={walks} router={router} />
      )}
      {tab === "slatedrop" && <SlateDropView projects={projects} router={router} />}
      {tab === "coordination" && <CoordinationView />}
      {tab === "deliverables" && <DeliverablesView />}
    </SiteWalkV1Shell>
  );
}

function shellTitle(tab: V1NavTab, orgName: string | null): string {
  switch (tab) {
    case "home":
      return orgName ? `${orgName} · Site Walk` : "Site Walk";
    case "worksites":
      return "Worksites";
    case "slatedrop":
      return "SlateDrop";
    case "coordination":
      return "Coordination";
    case "deliverables":
      return "Deliverables";
  }
}

