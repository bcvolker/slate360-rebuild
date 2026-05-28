"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, ClipboardList, FileText, FolderOpen, MapPin } from "lucide-react";
import {
  MobileEmptyState,
  MobileExpandableTabbedPanel,
  MobileHomeActionCard,
  MobileHomeActionGrid,
  MobileHomeLayout,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobilePanelTab } from "@/components/mobile-system";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import { cn } from "@/lib/utils";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import type { HubDeliverableRow } from "@/lib/types/site-walk-hub";

type Props = {
  orgName: string | null;
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
  deliverables: HubDeliverableRow[];
};

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
                    <span className="shrink-0 text-xs text-zinc-300">{walk.itemCount} items</span>
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
              actionClassName={mobileTokens.mobileDockEmptyAction}
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
              actionClassName={mobileTokens.mobileDockEmptyAction}
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
        <section className={cn(mobileTokens.mobileHomePrimaryActionsRegion, "gap-2")}>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={cn(mobileTokens.mobileIconChip, mobileTokens.mobileIconChipLg)}
              aria-hidden
            >
              <MapPin className={mobileTokens.mobileIconChipIconLg} strokeWidth={1.75} />
            </span>
            <h1 className={cn(mobileTokens.moduleTitle, "min-w-0")}>SITE WALK</h1>
          </div>
          <div className={mobileTokens.mobileHomeSectionHeader}>
            <span className={mobileTokens.appHomeSectionLabelAccent} aria-hidden />
            <p className={mobileTokens.appHomeSectionLabel}>Quick Actions</p>
          </div>
          <MobileHomeActionGrid className="min-h-0 flex-1">
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
        </section>
      }
      dock={<MobileExpandableTabbedPanel tabs={dockTabs} defaultTab="recent" />}
    />
  );
}
