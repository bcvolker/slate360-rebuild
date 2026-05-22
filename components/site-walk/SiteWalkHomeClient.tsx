"use client";



import { useEffect, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { SiteWalkV1Shell } from "@/components/site-walk/v1/SiteWalkV1Shell";

import type { V1NavTab } from "@/components/site-walk/v1/SiteWalkV1BottomNav";

import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";

import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";

import type { ListTab } from "@/components/site-walk/v1/SiteWalkV1ListPanel";

import { HomeView } from "@/components/site-walk/v1/views/HomeView";

import { WorksitesView } from "@/components/site-walk/v1/views/WorksitesView";

import { SlateDropView } from "@/components/site-walk/v1/views/SlateDropView";

import { CoordinationView } from "@/components/site-walk/v1/views/CoordinationView";

import {

  DeliverablesView,

  type V1DeliverableRow,

} from "@/components/site-walk/v1/views/DeliverablesView";

const V1_NAV_TABS = ["home", "worksites", "slatedrop", "coordination", "deliverables"] as const;
const HOME_DOCK_TABS = ["recent", "shared", "review"] as const;

function parseSiteWalkTab(value: string | null): { navTab: V1NavTab; dockTab: ListTab } {
  if (value && (HOME_DOCK_TABS as readonly string[]).includes(value)) {
    return { navTab: "home", dockTab: value as ListTab };
  }
  if (value && (V1_NAV_TABS as readonly string[]).includes(value)) {
    return { navTab: value as V1NavTab, dockTab: "recent" };
  }
  return { navTab: "home", dockTab: "recent" };
}

type Props = {

  orgName: string | null;

  userInitial: string;

  projects: HubProject[];

  walks: HubWalk[];

  summary: HubSummary;

  deliverables: V1DeliverableRow[];

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

  projects,

  walks,

  summary,

  deliverables,

}: Props) {

  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = parseSiteWalkTab(searchParams?.get("tab") ?? null);

  const [tab, setTab] = useState<V1NavTab>(tabFromUrl.navTab);
  const [dockTab, setDockTab] = useState<ListTab>(tabFromUrl.dockTab);

  const [startingQuickWalk, setStartingQuickWalk] = useState(false);

  useEffect(() => {
    const next = parseSiteWalkTab(searchParams?.get("tab") ?? null);
    setTab(next.navTab);
    setDockTab(next.dockTab);
  }, [searchParams]);

  function openHomeDock(panel: ListTab) {
    setTab("home");
    setDockTab(panel);
    router.push(`/site-walk?tab=${panel}`);
  }

  const title = shellTitle(tab, orgName);

  function handleTabChange(next: V1NavTab) {
    if (next === "coordination") {
      router.push("/coordination/inbox");
      return;
    }
    setTab(next);
  }

  async function handleQuickCapture() {

    if (startingQuickWalk) return;

    setStartingQuickWalk(true);

    try {

      const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const res = await fetch("/api/site-walk/sessions", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          title: `Quick Walk — ${dateLabel}`,

          session_type: "general",

          metadata: { started_at: new Date().toISOString(), started_from: "v1_home_quick" },

        }),

      });

      if (!res.ok) throw new Error(`Session create failed: ${res.status}`);

      const body = (await res.json()) as { session?: { id?: string } };

      const sessionId = body?.session?.id;

      if (!sessionId) throw new Error("No session ID returned");

      router.push(buildCaptureLaunchUrl({ session: sessionId, quick: "camera" }));

    } catch (err) {

      console.error("[SiteWalkHomeClient] Quick Walk error:", err);

      setStartingQuickWalk(false);

    }

  }



  return (

    <SiteWalkV1Shell title={title} activeTab={tab} onTabChange={handleTabChange}>

      {tab === "home" && (

        <HomeView

          walks={walks}

          projects={projects}

          summary={summary}

          router={router}

          setTab={setTab}

          dockTab={dockTab}

          openHomeDock={openHomeDock}

          onQuickCapture={handleQuickCapture}

        />

      )}

      {tab === "worksites" && (

        <WorksitesView projects={projects} walks={walks} router={router} setTab={setTab} />

      )}

      {tab === "slatedrop" && <SlateDropView projects={projects} router={router} />}

      {tab === "coordination" && <CoordinationView />}

      {tab === "deliverables" && (

        <DeliverablesView
          deliverables={deliverables}
          router={router}
          openHomeDock={openHomeDock}
        />

      )}

    </SiteWalkV1Shell>

  );

}


