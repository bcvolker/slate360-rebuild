"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Camera, ClipboardList, FileText, FolderOpen, MapPin } from "lucide-react";
import {
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeActionCard,
  MobileHomeActionGrid,
  MobileHomeListRow,
  MobileQuickActionsSection,
  mobileTokens,
  useMobileShellDock,
} from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";
import type { MobileHomeAssignment } from "@/lib/mobile/load-mobile-assignments";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import { buildSiteWalkDockRows, SiteWalkHomeFill } from "@/components/site-walk/SiteWalkHomeFill";
import { cn } from "@/lib/utils";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import type { HubDeliverableRow } from "@/lib/types/site-walk-hub";

type Props = {
  orgName: string | null;
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
  deliverables: HubDeliverableRow[];
  assignments: MobileHomeAssignment[];
};

function DockRowList({
  rows,
}: {
  rows: {
    key: string;
    title: string;
    meta?: string;
    href?: string;
    metaTone?: "neutral" | "primary" | "info";
  }[];
}) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <MobileHomeListRow
          key={row.key}
          title={row.title}
          meta={row.meta}
          metaTone={row.metaTone}
          href={row.href}
        />
      ))}
    </div>
  );
}

export function SiteWalkHomeClient({
  projects,
  walks,
  summary,
  deliverables,
  assignments,
}: Props) {
  const router = useRouter();

  async function handleQuickCapture() {
    const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const res = await fetch("/api/site-walk/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Quick Walk — ${dateLabel}`,
        session_type: "general",
        metadata: { started_at: new Date().toISOString(), started_from: "hub_quick" },
      }),
    });
    if (!res.ok) return;
    const body = (await res.json()) as { session?: { id?: string } };
    if (!body.session?.id) return;
    router.push(buildCaptureLaunchUrl({ session: body.session.id, quick: "camera" }));
  }

  const dockRows = useMemo(
    () => buildSiteWalkDockRows(walks, projects, deliverables, assignments, summary),
    [assignments, deliverables, projects, summary, walks],
  );

  const dockTabs: MobilePanelTab[] = useMemo(
    () => [
      {
        value: "recent",
        label: "Recent Walks",
        content:
          dockRows.walks.length > 0 ? (
            <DockRowList rows={dockRows.walks} />
          ) : (
            <MobileEmptyState
              compact
              icon={Camera}
              title="No walks yet"
              actionLabel="Start quick capture"
              actionClassName={mobileTokens.mobileDockEmptyAction}
              onAction={() => void handleQuickCapture()}
            />
          ),
      },
      {
        value: "projects",
        label: "Projects",
        content:
          dockRows.projects.length > 0 ? (
            <DockRowList rows={dockRows.projects} />
          ) : (
            <MobileEmptyState compact icon={MapPin} title="No projects linked yet" />
          ),
      },
      {
        value: "deliverables",
        label: "Deliverables",
        content:
          dockRows.deliverables.length > 0 ? (
            <DockRowList rows={dockRows.deliverables} />
          ) : (
            <MobileEmptyState
              compact
              icon={FileText}
              title="No deliverables yet"
              actionLabel="View deliverables"
              actionClassName={mobileTokens.mobileDockEmptyAction}
              actionHref="/site-walk/deliverables"
            />
          ),
      },
    ],
    [dockRows],
  );

  const dockContent = useMemo(
    () => (
      <div className={mobileTokens.mobileShellDockStack}>
        <MobileQuickActionsSection>
          <MobileHomeActionGrid aria-label="Quick actions">
            <MobileHomeActionCard
              title="Quick Walk"
              subtext="Start capturing now"
              icon={Camera}
              onClick={() => void handleQuickCapture()}
            />
            <MobileHomeActionCard
              title="Walk Sessions"
              subtext="Review saved walks"
              icon={FolderOpen}
              href="/site-walk/walks"
            />
            <MobileHomeActionCard
              title="Deliverables"
              subtext="Reports and outputs"
              icon={FileText}
              href="/site-walk/deliverables"
            />
            <MobileHomeActionCard
              title="Assigned Work"
              subtext="Tasks in the field"
              icon={ClipboardList}
              href="/site-walk/assigned-work"
            />
          </MobileHomeActionGrid>
        </MobileQuickActionsSection>
        <MobileExpandableTabbedPanel tabs={dockTabs} defaultTab="recent" />
      </div>
    ),
    [dockTabs],
  );

  useMobileShellDock(dockContent);

  return (
    <div data-mobile-route="site-walk" className={mobileTokens.mobileShellScrollInner}>
      <div className="flex shrink-0 items-center gap-3">
        <span
          className={cn(mobileTokens.mobileIconChip, mobileTokens.mobileIconChipLg)}
          aria-hidden
        >
          <MapPin className={mobileTokens.mobileIconChipIconLg} strokeWidth={1.75} />
        </span>
        <h1 className={cn(mobileTokens.moduleTitle, "min-w-0")}>SITE WALK</h1>
      </div>

      <SiteWalkHomeFill
        projects={projects}
        walks={walks}
        summary={summary}
        deliverables={deliverables}
        assignments={assignments}
      />
    </div>
  );
}
