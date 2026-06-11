"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Boxes,
  ChevronRight,
  FolderOpen,
  MapPin,
  Scan,
  Upload,
} from "lucide-react";
import {
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeListRow,
  MobileQuickActionsSection,
  MobileQuickActionStrip,
  mobileTokens,
  useMobileShellDock,
} from "@/components/mobile-system";
import type { MobilePanelTab, MobileQuickActionItem } from "@/components/mobile-system";
import {
  buildDigitalTwinDockRows,
  DigitalTwinHomeFill,
} from "@/components/digital-twin/DigitalTwinHomeFill";
import { DigitalTwinProjectTargetSheet } from "@/components/digital-twin/DigitalTwinProjectTargetSheet";
import {
  buildTwinCaptureLaunchUrl,
  buildTwinUploadLaunchUrl,
} from "@/lib/digital-twin/twin-capture-launch";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  orgName: string | null;
  twins: HubTwin[];
  projects: HubTwinProject[];
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

export function DigitalTwinHomeClient({ twins, projects }: Props) {
  const router = useRouter();
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);

  const scanFromProjectSubtext = useMemo(() => {
    if (projects.length === 1) return `Capture for ${projects[0]!.name}`;
    if (projects.length > 1) return `Choose from ${projects.length} projects`;
    return "Create a project to scan with full context";
  }, [projects]);

  const handleQuickScan = useCallback(() => {
    router.push(buildTwinCaptureLaunchUrl({ mode: "quick" }));
  }, [router]);

  const handleScanFromProject = useCallback(() => {
    if (projects.length === 0) {
      router.push("/projects");
      return;
    }
    setTargetSheetOpen(true);
  }, [projects.length, router]);

  const handleProjectSelected = useCallback(
    (project: HubTwinProject) => {
      router.push(
        buildTwinCaptureLaunchUrl({ projectId: project.id, mode: "project" }),
      );
    },
    [router],
  );

  const dockRows = useMemo(
    () => buildDigitalTwinDockRows(twins, projects),
    [projects, twins],
  );

  const quickActions: MobileQuickActionItem[] = useMemo(
    () => [
      { label: "My Twins", icon: Boxes, accent: "info", href: "/digital-twin/twins" },
      {
        label: "Upload Assets",
        icon: Upload,
        accent: "info",
        href: buildTwinUploadLaunchUrl({ mode: "quick" }),
      },
      {
        label: "Processing",
        icon: Activity,
        accent: "info",
        href: "/digital-twin/twins?status=processing",
      },
      { label: "Projects", icon: FolderOpen, accent: "info", href: "/projects" },
    ],
    [],
  );

  const dockTabs: MobilePanelTab[] = useMemo(
    () => [
      {
        value: "recent",
        label: "Recent Twins",
        content:
          dockRows.twins.length > 0 ? (
            <DockRowList rows={dockRows.twins} />
          ) : (
            <MobileEmptyState
              compact
              icon={Boxes}
              title="No twins yet"
              actionLabel="Start quick scan"
              actionClassName={mobileTokens.mobileDockEmptyAction}
              onAction={handleQuickScan}
            />
          ),
      },
      {
        value: "projects",
        label: "Workspaces",
        content:
          dockRows.projects.length > 0 ? (
            <DockRowList rows={dockRows.projects} />
          ) : (
            <MobileEmptyState compact icon={MapPin} title="No workspaces linked yet" />
          ),
      },
    ],
    [dockRows, handleQuickScan],
  );

  const dockContent = useMemo(
    () => (
      <MobileExpandableTabbedPanel tabs={dockTabs} defaultTab="recent" collapsedHeightPx={40} />
    ),
    [dockTabs],
  );

  useMobileShellDock(dockContent);

  return (
    <div className={mobileTokens.appHomeScrollInner}>
      <section className={mobileTokens.mobileHomeSection}>
        <div className={mobileTokens.mobileHomeSectionHeader}>
          <span className={mobileTokens.twin360HomeSectionLabelAccent} aria-hidden />
          <p className={mobileTokens.appHomeSectionLabel}>Start Scan</p>
        </div>
        <div className={mobileTokens.hubStartStack}>
          <button
            type="button"
            onClick={handleQuickScan}
            className={mobileTokens.hubStartHeroCard}
            aria-label="Start a quick scan"
          >
            <span className={mobileTokens.hubStartHeroIconBlue} aria-hidden>
              <Scan className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <span className={mobileTokens.hubStartTextBlock}>
              <span className={mobileTokens.hubStartHeroTitle}>Quick Scan</span>
              <span className={`block ${mobileTokens.hubStartSubtext}`}>
                Walk a space and capture now
              </span>
            </span>
            <ChevronRight className={mobileTokens.hubStartChevron} aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleScanFromProject}
            className={mobileTokens.hubStartHeroCard}
            aria-label="Scan from a project"
          >
            <span className={mobileTokens.hubStartHeroIconBlue} aria-hidden>
              <MapPin className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <span className={mobileTokens.hubStartTextBlock}>
              <span className={mobileTokens.hubStartHeroTitle}>Scan from Project</span>
              <span className={`block ${mobileTokens.hubStartSubtext}`}>{scanFromProjectSubtext}</span>
            </span>
            <ChevronRight className={mobileTokens.hubStartChevron} aria-hidden />
          </button>
        </div>
      </section>

      <MobileQuickActionsSection
        labelClassName={mobileTokens.appHomeSectionLabel}
        accentClassName={mobileTokens.twin360HomeSectionLabelAccent}
      >
        <MobileQuickActionStrip
          actions={quickActions}
          className={mobileTokens.appHomeQuickActionGrid}
          cardClassName={mobileTokens.twin360QuickActionCard}
        />
      </MobileQuickActionsSection>

      <DigitalTwinHomeFill twins={twins} projects={projects} />

      <DigitalTwinProjectTargetSheet
        open={targetSheetOpen}
        onOpenChange={setTargetSheetOpen}
        projects={projects}
        onSelect={handleProjectSelected}
      />
    </div>
  );
}
