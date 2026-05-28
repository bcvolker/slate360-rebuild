"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppWindow, Boxes, FolderOpen, Scan, Upload } from "lucide-react";
import {
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeActionCard,
  MobileHomeActionGrid,
  MobileHomeLayout,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";
import { cn } from "@/lib/utils";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

type Props = {
  orgName: string | null;
  twins: HubTwin[];
  projects: HubTwinProject[];
};

function formatTwinStatus(status: string) {
  return status.replace(/_/g, " ");
}

export function DigitalTwinHomeClient({ twins, projects }: Props) {
  const router = useRouter();

  function handleQuickCapture() {
    router.push("/digital-twin/capture");
  }

  const dockTabs: MobilePanelTab[] = useMemo(
    () => [
      {
        value: "recent",
        label: "Recent Twins",
        content:
          twins.length > 0 ? (
            <ul className="space-y-2">
              {twins.slice(0, 8).map((twin) => (
                <li key={twin.id}>
                  <Link
                    href={`/digital-twin/twins?space=${twin.id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.05] px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="min-w-0 truncate text-[#F8FAFC]">{twin.title}</span>
                    <span className="shrink-0 text-xs capitalize text-zinc-300">
                      {formatTwinStatus(twin.status)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <MobileEmptyState
              compact
              icon={Boxes}
              title="No twins yet"
              actionLabel="Start quick capture"
              actionClassName={mobileTokens.mobileDockEmptyAction}
              onAction={handleQuickCapture}
            />
          ),
      },
      {
        value: "projects",
        label: "Workspaces",
        content:
          projects.length > 0 ? (
            <ul className="space-y-2">
              {projects.slice(0, 8).map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="block rounded-xl border border-white/[0.05] px-3 py-2.5 text-sm text-[#F8FAFC] transition-colors hover:bg-white/[0.03]"
                  >
                    {project.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <MobileEmptyState
              compact
              icon={FolderOpen}
              title="No workspaces linked yet"
              actionLabel="View projects"
              actionClassName={mobileTokens.mobileDockEmptyAction}
              actionHref="/projects"
            />
          ),
      },
      {
        value: "shared",
        label: "Shared with Me",
        content: (
          <MobileEmptyState
            compact
            icon={AppWindow}
            title="Nothing shared with you yet"
            description="Twins shared by teammates will appear here."
          />
        ),
      },
    ],
    [projects, twins],
  );

  return (
    <MobileHomeLayout
      route="digital-twin"
      contentTop={null}
      primaryActions={
        <section className={cn(mobileTokens.mobileHomePrimaryActionsRegion, "gap-2")}>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={cn(mobileTokens.mobileIconChip, mobileTokens.mobileIconChipLg)}
              aria-hidden
            >
              <AppWindow className={mobileTokens.mobileIconChipIconLg} strokeWidth={1.75} />
            </span>
            <h1 className={cn(mobileTokens.moduleTitle, "min-w-0")}>DIGITAL TWIN</h1>
          </div>
          <div className={mobileTokens.mobileHomeSectionHeader}>
            <span className={mobileTokens.appHomeSectionLabelAccent} aria-hidden />
            <p className={mobileTokens.appHomeSectionLabel}>Quick Actions</p>
          </div>
          <MobileHomeActionGrid className="min-h-0 flex-1">
            <MobileHomeActionCard
              title="Quick Capture"
              subtext="Camera and LiDAR when available"
              icon={Scan}
              onClick={handleQuickCapture}
            />
            <MobileHomeActionCard
              title="Upload from Phone"
              subtext="360 video or drone footage"
              icon={Upload}
              href="/digital-twin/upload"
            />
            <MobileHomeActionCard
              title="My Twins"
              subtext="View existing twins"
              icon={Boxes}
              href="/digital-twin/twins"
            />
            <MobileHomeActionCard
              title="Projects"
              subtext="Workspace context"
              icon={FolderOpen}
              href="/projects"
            />
          </MobileHomeActionGrid>
        </section>
      }
      dock={<MobileExpandableTabbedPanel tabs={dockTabs} defaultTab="recent" />}
    />
  );
}
