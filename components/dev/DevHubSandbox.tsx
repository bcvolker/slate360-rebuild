"use client";

import { useMemo } from "react";
import {
  resolveModuleHomeBrand,
} from "@/components/mobile-system/mainMobileTabs";
import { MobilePlatformBottomNav } from "@/components/mobile-system/MobileBottomNav";
import { MobilePlatformHeader } from "@/components/mobile-system/MobilePlatformHeader";
import { MobileShell } from "@/components/mobile-system/MobileShell";
import { InviteShareProvider } from "@/components/shared/InviteShareProvider";
import { SiteWalkHomeClient } from "@/components/site-walk/SiteWalkHomeClient";
import { DigitalTwinHomeClient } from "@/components/digital-twin/DigitalTwinHomeClient";
import { MobileAppRootContent } from "@/components/studio-ui/MobileAppRootContent";
import type { MobileHomeAssignment } from "@/lib/mobile/load-mobile-assignments";
import type { MobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import type { MobileLauncherAppView } from "@/lib/mobile/mobile-launcher-app-types";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import type { HubDeliverableRow } from "@/lib/types/site-walk-hub";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

export type DevHubVariant = "app" | "site-walk" | "twin";

const NOW = "2026-06-10T14:30:00.000Z";
const YESTERDAY = "2026-06-09T16:45:00.000Z";
const LAST_WEEK = "2026-06-03T09:15:00.000Z";

// ---- Site Walk mocks -------------------------------------------------------

const MOCK_SW_PROJECTS: HubProject[] = [
  {
    id: "dev-proj-1",
    name: "Riverside Medical Center",
    description: "Phase 2 interior buildout",
    status: "active",
    createdAt: LAST_WEEK,
    projectType: "full",
  },
  {
    id: "dev-proj-2",
    name: "Oakline Logistics Hub",
    description: null,
    status: "active",
    createdAt: LAST_WEEK,
    projectType: "full",
  },
];

const MOCK_SW_WALKS: HubWalk[] = [
  {
    id: "dev-walk-1",
    title: "Riverside — Level 2 punch",
    status: "active",
    projectId: "dev-proj-1",
    projectName: "Riverside Medical Center",
    startedAt: NOW,
    completedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    itemCount: 14,
    syncState: "synced",
    isStarred: true,
  },
  {
    id: "dev-walk-2",
    title: "Oakline dock inspection",
    status: "completed",
    projectId: "dev-proj-2",
    projectName: "Oakline Logistics Hub",
    startedAt: YESTERDAY,
    completedAt: YESTERDAY,
    createdAt: YESTERDAY,
    updatedAt: YESTERDAY,
    itemCount: 8,
    syncState: "synced",
    isStarred: false,
  },
  {
    id: "dev-walk-3",
    title: "Quick Walk — Jun 3",
    status: "completed",
    projectId: null,
    projectName: null,
    startedAt: LAST_WEEK,
    completedAt: LAST_WEEK,
    createdAt: LAST_WEEK,
    updatedAt: LAST_WEEK,
    itemCount: 5,
    syncState: "pending",
    isStarred: false,
  },
];

const MOCK_SW_DELIVERABLES: HubDeliverableRow[] = [
  {
    id: "dev-del-1",
    title: "Level 2 punch report",
    deliverable_type: "pdf_report",
    status: "draft",
    created_at: NOW,
    share_token: null,
  },
  {
    id: "dev-del-2",
    title: "Dock inspection summary",
    deliverable_type: "pdf_report",
    status: "shared",
    created_at: YESTERDAY,
    share_token: "dev-token",
  },
];

const MOCK_SW_ASSIGNMENTS: MobileHomeAssignment[] = [
  {
    id: "dev-assign-1",
    title: "Verify fire caulking at stair B",
    status: "open",
    sessionId: "dev-walk-1",
  },
];

const MOCK_SW_SUMMARY: HubSummary = {
  openItems: 6,
  needsReview: 2,
  draftDeliverables: 1,
  unsyncedItems: 1,
};

// ---- Twin mocks ------------------------------------------------------------

const MOCK_TWINS: HubTwin[] = [
  {
    id: "dev-twin-1",
    title: "Riverside lobby scan",
    status: "ready",
    statusChip: "READY",
    projectId: "dev-proj-1",
    projectName: "Riverside Medical Center",
    updatedAt: NOW,
  },
  {
    id: "dev-twin-2",
    title: "Oakline warehouse bay 4",
    status: "processing",
    statusChip: "PROCESSING",
    projectId: "dev-proj-2",
    projectName: "Oakline Logistics Hub",
    updatedAt: YESTERDAY,
  },
  {
    id: "dev-twin-3",
    title: "Quick scan — mech room",
    status: "failed",
    statusChip: "FAILED",
    projectId: null,
    projectName: null,
    updatedAt: LAST_WEEK,
  },
];

const MOCK_TWIN_PROJECTS: HubTwinProject[] = [
  { id: "dev-proj-1", name: "Riverside Medical Center", status: "active", createdAt: LAST_WEEK },
  { id: "dev-proj-2", name: "Oakline Logistics Hub", status: "active", createdAt: LAST_WEEK },
];

// ---- /app home mocks -------------------------------------------------------

const MOCK_APP_HOME_DATA: MobileAppHomeData = {
  recentWalks: [
    { id: "dev-walk-1", title: "Riverside — Level 2 punch", status: "active", createdAt: NOW },
    { id: "dev-walk-2", title: "Oakline dock inspection", status: "completed", createdAt: YESTERDAY },
    { id: "dev-walk-3", title: "Quick Walk — Jun 3", status: "completed", createdAt: LAST_WEEK },
  ],
  recentDeliverables: [
    { id: "dev-del-1", title: "Level 2 punch report", createdAt: NOW },
    { id: "dev-del-2", title: "Dock inspection summary", createdAt: YESTERDAY },
  ],
  recentSlateDrop: [
    { id: "dev-drop-1", filename: "riverside-floorplans.pdf", status: "completed", createdAt: NOW },
    { id: "dev-drop-2", filename: "bay4-walkthrough.mp4", status: "processing", createdAt: YESTERDAY },
  ],
  processingQueue: [
    { id: "dev-drop-2", filename: "bay4-walkthrough.mp4", status: "processing", createdAt: YESTERDAY },
  ],
  twinProcessingCount: 1,
  alerts: [
    {
      id: "dev-alert-1",
      title: "Punch item assigned",
      message: "Verify fire caulking at stair B",
      linkPath: "/site-walk/assigned-work",
      createdAt: NOW,
    },
  ],
  assignments: MOCK_SW_ASSIGNMENTS,
  hubSummary: MOCK_SW_SUMMARY,
};

const MOCK_LAUNCHER_APPS: MobileLauncherAppView[] = [
  {
    id: "site-walk",
    title: "Site Walk",
    subtext: "Capture and document the field",
    statusSubline: "1 walk in progress",
    href: "/site-walk",
    accent: "primary",
    access: "entitled",
    entitlementKey: "site_walk",
    upsellBullets: ["Field capture", "Punch lists", "PDF reports"],
  },
  {
    id: "digital-twin",
    title: "Twin 360",
    subtext: "Scan spaces into 3D twins",
    statusSubline: "1 twin processing",
    href: "/digital-twin",
    accent: "info",
    access: "entitled",
    entitlementKey: "digital_twin",
    upsellBullets: ["3D scans", "Shareable twins", "Measurements"],
  },
  {
    id: "tours",
    title: "Tours",
    subtext: "Build guided walkthroughs",
    statusSubline: null,
    href: "/tours",
    accent: "info",
    access: "upsell",
    entitlementKey: "tours",
    upsellBullets: ["Guided walkthroughs", "Client sharing", "Branded tours"],
  },
];

// ---- Sandbox ---------------------------------------------------------------

export function DevHubSandbox({ variant }: { variant: DevHubVariant }) {
  const { brand, route, content } = useMemo(() => {
    switch (variant) {
      case "site-walk":
        return {
          brand: resolveModuleHomeBrand("/site-walk"),
          route: "site-walk" as const,
          content: (
            <SiteWalkHomeClient
              orgName="Slate Dev Org"
              projects={MOCK_SW_PROJECTS}
              walks={MOCK_SW_WALKS}
              summary={MOCK_SW_SUMMARY}
              deliverables={MOCK_SW_DELIVERABLES}
              assignments={MOCK_SW_ASSIGNMENTS}
              walkStartTier="project"
            />
          ),
        };
      case "twin":
        return {
          brand: resolveModuleHomeBrand("/digital-twin"),
          route: "digital-twin" as const,
          content: (
            <DigitalTwinHomeClient
              orgName="Slate Dev Org"
              twins={MOCK_TWINS}
              projects={MOCK_TWIN_PROJECTS}
            />
          ),
        };
      default:
        return {
          brand: null,
          route: "app" as const,
          content: (
            <MobileAppRootContent
              homeData={MOCK_APP_HOME_DATA}
              launcherApps={MOCK_LAUNCHER_APPS}
            />
          ),
        };
    }
  }, [variant]);

  return (
    <InviteShareProvider>
      <div className="h-full min-h-0 w-full">
        <MobileShell
          mobileRoute={route}
          className="h-full"
          header={<MobilePlatformHeader moduleHomeBrand={brand} />}
          bottomNav={<MobilePlatformBottomNav />}
        >
          {content}
        </MobileShell>
      </div>
    </InviteShareProvider>
  );
}
