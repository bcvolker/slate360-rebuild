"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppWindow, Boxes, FolderOpen, Scan, Upload } from "lucide-react";
import {
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeLayout,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";
import { cn } from "@/lib/utils";
import type { HubTwin, HubTwinProject } from "@/lib/types/digital-twin-hub";

const TWIN_ICON =
  "border border-[#6EA7A0]/20 bg-[#6EA7A0]/10 text-[#6EA7A0]";
const DOCK_EMPTY_ACTION =
  "text-[12px] font-medium text-[#85CBC3] hover:text-[#85CBC3]/85 hover:underline";

type Props = {
  orgName: string | null;
  twins: HubTwin[];
  projects: HubTwinProject[];
};

function ActionLink({
  href,
  label,
  subtext,
  icon: Icon,
}: {
  href: string;
  label: string;
  subtext: string;
  icon: typeof Scan;
}) {
  return (
    <Link
      href={href}
      className={cn(
        mobileTokens.siteWalkActionGridButton,
        "h-full min-h-[118px]",
        mobileTokens.focusRing,
      )}
    >
      <span className={cn(mobileTokens.siteWalkActionGridIcon, TWIN_ICON)} aria-hidden>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={mobileTokens.siteWalkActionGridLabel}>{label}</span>
      <span className={mobileTokens.siteWalkActionGridSubtext}>{subtext}</span>
    </Link>
  );
}

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
              actionClassName={DOCK_EMPTY_ACTION}
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
              actionClassName={DOCK_EMPTY_ACTION}
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
        <section className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                TWIN_ICON,
              )}
              aria-hidden
            >
              <AppWindow className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <h1 className={cn(mobileTokens.moduleTitle, "min-w-0 text-[#FFFFFF]")}>
              DIGITAL TWIN
            </h1>
          </div>
          <div className="shrink-0">
            <span className={mobileTokens.appHomeSectionLabelAccentCool} aria-hidden />
            <p className={mobileTokens.appHomeSectionLabel}>Quick Actions</p>
          </div>
          <div
            className={cn(
              mobileTokens.siteWalkActionGridRow,
              "min-h-0 flex-1 auto-rows-fr",
            )}
          >
            <button
              type="button"
              onClick={handleQuickCapture}
              className={cn(
                mobileTokens.siteWalkActionGridButton,
                "h-full min-h-[118px]",
                mobileTokens.focusRing,
              )}
            >
              <span className={cn(mobileTokens.siteWalkActionGridIcon, TWIN_ICON)} aria-hidden>
                <Scan className="h-[18px] w-[18px]" />
              </span>
              <span className={mobileTokens.siteWalkActionGridLabel}>Quick Capture</span>
              <span className={mobileTokens.siteWalkActionGridSubtext}>
                Camera and LiDAR when available
              </span>
            </button>
            <ActionLink
              href="/digital-twin/upload"
              label="Upload from Phone"
              subtext="360 video or drone footage"
              icon={Upload}
            />
            <ActionLink
              href="/digital-twin/twins"
              label="My Twins"
              subtext="View existing twins"
              icon={Boxes}
            />
            <ActionLink
              href="/projects"
              label="Projects"
              subtext="Workspace context"
              icon={FolderOpen}
            />
          </div>
        </section>
      }
      dock={
        <MobileExpandableTabbedPanel tabs={dockTabs} defaultTab="recent" className="pt-1" />
      }
    />
  );
}
