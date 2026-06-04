"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ClipboardList,
  FileText,
  FolderOpen,
  MapPin,
} from "lucide-react";
import {
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeActionCard,
  MobileHomeListRow,
  MobileQuickActionsSection,
  MobileQuickActionStrip,
  mobileTokens,
  useMobileShellDock,
} from "@/components/mobile-system";
import type { MobilePanelTab, MobileQuickActionItem } from "@/components/mobile-system";
import type { MobileHomeAssignment } from "@/lib/mobile/load-mobile-assignments";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import { buildSiteWalkDockRows, SiteWalkHomeFill } from "@/components/site-walk/SiteWalkHomeFill";
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

function pickActiveWorksite(walks: HubWalk[], projects: HubProject[]) {
  if (walks.length > 0) {
    const latest = walks[0]!;
    return {
      label: latest.projectName ?? latest.title,
      projectId: latest.projectId,
      walkId: latest.id,
    };
  }
  if (projects.length > 0) {
    return { label: projects[0]!.name, projectId: projects[0]!.id, walkId: null };
  }
  return null;
}

export function SiteWalkHomeClient({
  projects,
  walks,
  summary,
  deliverables,
  assignments,
}: Props) {
  const router = useRouter();
  const worksite = useMemo(() => pickActiveWorksite(walks, projects), [projects, walks]);

  const handleQuickCapture = useCallback(async () => {
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
  }, [router]);

  const handleProjectWalk = useCallback(async () => {
    const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const label = worksite?.label ?? projects[0]?.name ?? "Project Walk";
    const res = await fetch("/api/site-walk/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${label} — ${dateLabel}`,
        session_type: "general",
        project_id: worksite?.projectId ?? projects[0]?.id ?? undefined,
        metadata: {
          started_at: new Date().toISOString(),
          started_from: "hub_hero",
        },
      }),
    });
    if (!res.ok) return;
    const body = (await res.json()) as { session?: { id?: string } };
    if (!body.session?.id) return;
    router.push(buildCaptureLaunchUrl({ session: body.session.id, quick: "camera" }));
  }, [projects, router, worksite]);

  const dockRows = useMemo(
    () => buildSiteWalkDockRows(walks, projects, deliverables, assignments, summary),
    [assignments, deliverables, projects, summary, walks],
  );

  const quickActions: MobileQuickActionItem[] = useMemo(
    () => [
      { label: "Walk Sessions", icon: FolderOpen, accent: "primary", href: "/site-walk/walks" },
      { label: "Deliverables", icon: FileText, accent: "primary", href: "/site-walk/deliverables" },
      {
        label: "Assigned Work",
        icon: ClipboardList,
        accent: "primary",
        href: "/site-walk/assigned-work",
      },
      { label: "Projects", icon: MapPin, accent: "primary", href: "/projects" },
    ],
    [],
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
    [dockRows, handleQuickCapture],
  );

  const dockContent = useMemo(
    () => <MobileExpandableTabbedPanel tabs={dockTabs} defaultTab="recent" />,
    [dockTabs],
  );

  useMobileShellDock(dockContent);

  const projectWalkSubtext = worksite
    ? `Capture at ${worksite.label}`
    : projects.length > 0
      ? `Start at ${projects[0]!.name}`
      : "Link a project to capture on site";

  return (
    <div data-mobile-route="site-walk" className={mobileTokens.appHomeScrollInner}>
      <section className={mobileTokens.mobileHomeSection}>
        <div className={mobileTokens.mobileHomeSectionHeader}>
          <span className={mobileTokens.siteWalkHomeSectionLabelAccent} aria-hidden />
          <p className={mobileTokens.appHomeSectionLabel}>Start Walk</p>
        </div>
        <div className={mobileTokens.siteWalkStartWalkGrid}>
          <MobileHomeActionCard
            title="Quick Walk"
            subtext="Start capturing now"
            icon={Camera}
            onClick={() => void handleQuickCapture()}
            className={mobileTokens.siteWalkStartWalkCard}
            iconWrapperClassName={mobileTokens.siteWalkStartWalkIconWrapper}
            iconClassName={mobileTokens.siteWalkStartWalkIcon}
            titleClassName={mobileTokens.siteWalkStartWalkTitle}
            subtextClassName={mobileTokens.siteWalkStartWalkSubtext}
            aria-label="Start a quick walk"
          />
          <MobileHomeActionCard
            title="Project Walk"
            subtext={projectWalkSubtext}
            icon={MapPin}
            onClick={() => void handleProjectWalk()}
            className={mobileTokens.siteWalkStartWalkCard}
            iconWrapperClassName={mobileTokens.siteWalkStartWalkIconWrapper}
            iconClassName={mobileTokens.siteWalkStartWalkIcon}
            titleClassName={mobileTokens.siteWalkStartWalkTitle}
            subtextClassName={mobileTokens.siteWalkStartWalkSubtext}
            aria-label="Start a project walk"
          />
        </div>
      </section>

      <MobileQuickActionsSection
        labelClassName={mobileTokens.appHomeSectionLabel}
        accentClassName={mobileTokens.siteWalkHomeSectionLabelAccent}
      >
        <MobileQuickActionStrip
          actions={quickActions}
          className={mobileTokens.appHomeQuickActionGrid}
          cardClassName={mobileTokens.appHomeQuickActionCard}
        />
      </MobileQuickActionsSection>

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
