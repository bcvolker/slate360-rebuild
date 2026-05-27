"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, ClipboardList, FileText, FolderOpen, MapPin } from "lucide-react";
import {
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeLayout,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import { cn } from "@/lib/utils";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import type { HubDeliverableRow } from "@/lib/types/site-walk-hub";

const SITE_WALK_ICON =
  "border border-[#6EA7A0]/20 bg-[#6EA7A0]/10 text-[#6EA7A0]";
const DOCK_EMPTY_ACTION =
  "text-[12px] font-medium text-[#85CBC3] hover:text-[#85CBC3]/85 hover:underline";

type Props = {
  orgName: string | null;
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
  deliverables: HubDeliverableRow[];
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
  icon: typeof Camera;
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
      <span
        className={cn(
          mobileTokens.siteWalkActionGridIcon,
          SITE_WALK_ICON,
        )}
        aria-hidden
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={mobileTokens.siteWalkActionGridLabel}>{label}</span>
      <span className={mobileTokens.siteWalkActionGridSubtext}>{subtext}</span>
    </Link>
  );
}

export function SiteWalkHomeClient({ projects, walks, deliverables }: Props) {
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

  const dockTabs: MobilePanelTab[] = useMemo(
    () => [
      {
        value: "recent",
        label: "Recent Walks",
        content:
          walks.length > 0 ? (
            <ul className="space-y-2">
              {walks.slice(0, 8).map((walk) => (
                <li key={walk.id}>
                  <Link
                    href={`/site-walk/walks/${walk.id}`}
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="truncate text-[#F8FAFC]">{walk.title}</span>
                    <span className="shrink-0 text-xs text-zinc-400">{walk.itemCount} items</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <MobileEmptyState
              compact
              icon={Camera}
              title="No walks yet"
              actionLabel="Start quick capture"
              actionClassName={DOCK_EMPTY_ACTION}
              onAction={() => void handleQuickCapture()}
            />
          ),
      },
      {
        value: "projects",
        label: "Projects",
        content:
          projects.length > 0 ? (
            <ul className="space-y-2">
              {projects.slice(0, 8).map((project) => (
                <li
                  key={project.id}
                  className="rounded-xl border border-white/[0.05] px-3 py-2.5 text-sm text-[#F8FAFC]"
                >
                  {project.name}
                </li>
              ))}
            </ul>
          ) : (
            <MobileEmptyState compact icon={MapPin} title="No projects linked yet" />
          ),
      },
      {
        value: "deliverables",
        label: "Deliverables",
        content:
          deliverables.length > 0 ? (
            <ul className="space-y-2">
              {deliverables.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link
                    href="/site-walk/deliverables"
                    className="block rounded-xl border border-white/[0.05] px-3 py-2.5 text-sm text-[#F8FAFC] transition-colors hover:bg-white/[0.03]"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <MobileEmptyState
              compact
              icon={FileText}
              title="No deliverables yet"
              actionLabel="View deliverables"
              actionClassName={DOCK_EMPTY_ACTION}
              actionHref="/site-walk/deliverables"
            />
          ),
      },
    ],
    [deliverables, projects, walks],
  );

  return (
    <MobileHomeLayout
      route="site-walk"
      contentTop={null}
      primaryActions={
        <section className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                SITE_WALK_ICON,
              )}
              aria-hidden
            >
              <MapPin className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
            <h1 className={cn(mobileTokens.moduleTitle, "min-w-0 text-[#FFFFFF]")}>
              SITE WALK
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
              onClick={() => void handleQuickCapture()}
              className={cn(
                mobileTokens.siteWalkActionGridButton,
                "h-full min-h-[118px]",
                mobileTokens.focusRing,
              )}
            >
              <span
                className={cn(mobileTokens.siteWalkActionGridIcon, SITE_WALK_ICON)}
                aria-hidden
              >
                <Camera className="h-[18px] w-[18px]" />
              </span>
              <span className={mobileTokens.siteWalkActionGridLabel}>Quick Walk</span>
              <span className={mobileTokens.siteWalkActionGridSubtext}>Start capturing now</span>
            </button>
            <ActionLink
              href="/site-walk/walks"
              label="Walk Sessions"
              subtext="Review saved walks"
              icon={FolderOpen}
            />
            <ActionLink
              href="/site-walk/deliverables"
              label="Deliverables"
              subtext="Reports and outputs"
              icon={FileText}
            />
            <ActionLink
              href="/site-walk/assigned-work"
              label="Assigned Work"
              subtext="Tasks in the field"
              icon={ClipboardList}
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
