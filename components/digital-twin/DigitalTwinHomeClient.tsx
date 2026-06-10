"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Boxes,
  MapPin,
  Scan,
  Share2,
  Upload,
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
        label: "Shared",
        icon: Share2,
        accent: "info",
        href: "/digital-twin/twins",
      },
      {
        label: "Processing",
        icon: Activity,
        accent: "info",
        href: "/digital-twin/twins",
      },
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
      {
        value: "shared",
        label: "Shared with Me",
        content: (
          <MobileEmptyState
            compact
            icon={Share2}
            title="Nothing shared with you yet"
            description="Twins shared by teammates will appear here."
          />
        ),
      },
    ],
    [dockRows, handleQuickScan],
  );

  const dockContent = useMemo(
    () => <MobileExpandableTabbedPanel tabs={dockTabs} defaultTab="recent" />,
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
        <div className={mobileTokens.twin360StartScanGrid}>
          <MobileHomeActionCard
            title="Quick Scan"
            subtext="Walk a space and capture now"
            icon={Scan}
            onClick={handleQuickScan}
            accent="info"
            className={mobileTokens.twin360StartScanCard}
            iconWrapperClassName={mobileTokens.twin360StartScanIconWrapper}
            iconClassName={mobileTokens.twin360StartScanIcon}
            titleClassName={mobileTokens.twin360StartScanTitle}
            subtextClassName={mobileTokens.twin360StartScanSubtext}
            aria-label="Start a quick scan"
          />
          <MobileHomeActionCard
            title="Scan from Project"
            subtext={scanFromProjectSubtext}
            icon={MapPin}
            onClick={handleScanFromProject}
            accent="info"
            className={mobileTokens.twin360StartScanCard}
            iconWrapperClassName={mobileTokens.twin360StartScanIconWrapper}
            iconClassName={mobileTokens.twin360StartScanIcon}
            titleClassName={mobileTokens.twin360StartScanTitle}
            subtextClassName={mobileTokens.twin360StartScanSubtext}
            aria-label="Scan from a project"
          />
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
