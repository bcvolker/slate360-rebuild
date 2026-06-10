"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
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
import {
  filterHubProjectsForWalkStart,
  walkStartCreateRoute,
  type SiteWalkWalkStartTier,
} from "@/lib/site-walk/resolve-walk-start-tier";
import { buildSiteWalkDockRows, SiteWalkHomeFill } from "@/components/site-walk/SiteWalkHomeFill";
import { SiteWalkWalkTargetSheet } from "@/components/site-walk/SiteWalkWalkTargetSheet";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import type { HubDeliverableRow } from "@/lib/types/site-walk-hub";

type Props = {
  orgName: string | null;
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
  deliverables: HubDeliverableRow[];
  assignments: MobileHomeAssignment[];
  walkStartTier: SiteWalkWalkStartTier;
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

const SCOPED_WALK_COPY: Record<
  SiteWalkWalkStartTier,
  { title: string; icon: typeof MapPin; emptySubtext: string; startedFrom: string; ariaLabel: string }
> = {
  workspace: {
    title: "Workspace Walk",
    icon: Building2,
    emptySubtext: "Create a workspace to capture on site",
    startedFrom: "hub_workspace_walk",
    ariaLabel: "Start a workspace walk",
  },
  project: {
    title: "Project Walk",
    icon: MapPin,
    emptySubtext: "Create a project to capture on site",
    startedFrom: "hub_project_walk",
    ariaLabel: "Start a project walk",
  },
};

export function SiteWalkHomeClient({
  projects,
  walks,
  summary,
  deliverables,
  assignments,
  walkStartTier,
}: Props) {
  const router = useRouter();
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);
  const [quickCaptureError, setQuickCaptureError] = useState<string | null>(null);

  const walkTargets = useMemo(
    () => filterHubProjectsForWalkStart(projects, walkStartTier),
    [projects, walkStartTier],
  );

  const scopedCopy = SCOPED_WALK_COPY[walkStartTier];

  const scopedWalkSubtext = useMemo(() => {
    if (walkTargets.length === 1) return `Capture at ${walkTargets[0]!.name}`;
    if (walkTargets.length > 1) return `Choose from ${walkTargets.length} ${walkStartTier === "project" ? "projects" : "workspaces"}`;
    return scopedCopy.emptySubtext;
  }, [scopedCopy.emptySubtext, walkStartTier, walkTargets]);

  const startScopedSession = useCallback(
    async (project: HubProject) => {
      const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const res = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${project.name} — ${dateLabel}`,
          session_type: "general",
          project_id: project.id,
          metadata: {
            started_at: new Date().toISOString(),
            started_from: scopedCopy.startedFrom,
          },
        }),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { session?: { id?: string } };
      if (!body.session?.id) return;
      router.push(buildCaptureLaunchUrl({ session: body.session.id, quick: "camera" }));
    },
    [router, scopedCopy.startedFrom],
  );

  const handleQuickCapture = useCallback(async () => {
    setQuickCaptureError(null);
    const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    let res: Response;
    try {
      res = await fetch("/api/site-walk/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Quick Walk — ${dateLabel}`,
          session_type: "general",
          metadata: { started_at: new Date().toISOString(), started_from: "hub_quick" },
        }),
      });
    } catch {
      setQuickCaptureError("Could not reach the server. Check your connection and try again.");
      return;
    }
    if (!res.ok) {
      let message = "Could not start a walk session. Try again.";
      try {
        const body = (await res.json()) as { error?: string; message?: string };
        message = body.error ?? body.message ?? message;
      } catch {
        // keep default message
      }
      setQuickCaptureError(message);
      return;
    }
    const body = (await res.json()) as { session?: { id?: string } };
    if (!body.session?.id) {
      setQuickCaptureError("Walk session was created but could not be opened. Try again.");
      return;
    }
    router.push(buildCaptureLaunchUrl({ session: body.session.id, quick: "camera" }));
  }, [router]);

  const handleScopedWalk = useCallback(() => {
    if (walkTargets.length === 0) {
      router.push(walkStartCreateRoute(walkStartTier));
      return;
    }
    setTargetSheetOpen(true);
  }, [router, walkStartTier, walkTargets.length]);

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

  const ScopedIcon = scopedCopy.icon;

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
            title={scopedCopy.title}
            subtext={scopedWalkSubtext}
            icon={ScopedIcon}
            onClick={handleScopedWalk}
            className={mobileTokens.siteWalkStartWalkCard}
            iconWrapperClassName={mobileTokens.siteWalkStartWalkIconWrapper}
            iconClassName={mobileTokens.siteWalkStartWalkIcon}
            titleClassName={mobileTokens.siteWalkStartWalkTitle}
            subtextClassName={mobileTokens.siteWalkStartWalkSubtext}
            aria-label={scopedCopy.ariaLabel}
          />
        </div>
        {quickCaptureError ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200"
          >
            {quickCaptureError}
          </p>
        ) : null}
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

      <SiteWalkWalkTargetSheet
        open={targetSheetOpen}
        onOpenChange={setTargetSheetOpen}
        tier={walkStartTier}
        targets={walkTargets}
        onSelect={(project) => void startScopedSession(project)}
      />
    </div>
  );
}
