"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteWalkV1Shell } from "@/components/site-walk/v1/SiteWalkV1Shell";
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
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
};

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

export function SiteWalkHomeClient({
  orgName,
  userInitial,
  projects,
  walks,
  summary,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<V1NavTab>("home");

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
      {tab === "coordination" && <CoordinationView router={router} />}
      {tab === "deliverables" && <DeliverablesView router={router} />}
    </SiteWalkV1Shell>
  );
}
