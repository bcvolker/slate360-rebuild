"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteWalkV1Shell } from "@/components/site-walk/v1/SiteWalkV1Shell";
import { SiteWalkV1ActionGrid } from "@/components/site-walk/v1/SiteWalkV1ActionGrid";
import { SiteWalkV1ListPanel } from "@/components/site-walk/v1/SiteWalkV1ListPanel";
import { WorksiteV1Row } from "@/components/site-walk/v1/WorksiteV1Row";
import { WalkV1Row } from "@/components/site-walk/v1/WalkV1Row";
import { PlanWorkspaceV1Skeleton } from "@/components/site-walk/v1/PlanWorkspaceV1Skeleton";
import { CaptureWorkspaceV1Skeleton } from "@/components/site-walk/v1/CaptureWorkspaceV1Skeleton";
import type { V1NavTab } from "@/components/site-walk/v1/SiteWalkV1BottomNav";
import type { HubProject, HubSummary, HubWalk } from "@/app/site-walk/_components/siteWalkHubTypes";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Upload,
  Share2,
  Link as LinkIcon,
  ClipboardList,
  MessageSquare,
  Inbox,
  Users,
  Mail,
  BookUser,
  Plus,
  Package,
  FileText,
  Camera,
  Eye,
  Globe,
  CuboidIcon,
  Clock,
  FileDown,
  CheckSquare,
} from "lucide-react";

type Props = {
  orgName: string | null;
  userInitial: string;
  isAdmin: boolean;
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
};

type PreviewScreen = "shell" | "plan" | "capture";

export function V1PreviewClient({
  orgName,
  userInitial,
  isAdmin,
  projects,
  walks,
  summary,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<V1NavTab>("home");
  const [screen, setScreen] = useState<PreviewScreen>("shell");

  if (screen === "plan") {
    return (
      <PlanWorkspaceV1Skeleton
        worksiteName="Plan Preview"
        walkTitle="(read-only skeleton)"
        onBack={() => setScreen("shell")}
      />
    );
  }
  if (screen === "capture") {
    return (
      <CaptureWorkspaceV1Skeleton
        onBack={() => setScreen("plan")}
        onExit={() => setScreen("shell")}
      />
    );
  }

  const title = shellTitle(tab, orgName);

  return (
    <SiteWalkV1Shell title={title} activeTab={tab} onTabChange={setTab}>
      {tab === "home" && (
        <HomeView
          walks={walks}
          projects={projects}
          summary={summary}
          router={router}
          setTab={setTab}
        />
      )}
      {tab === "worksites" && (
        <WorksitesView projects={projects} walks={walks} router={router} />
      )}
      {tab === "slatedrop" && <SlateDropView projects={projects} router={router} />}
      {tab === "coordination" && <CoordinationView router={router} />}
      {tab === "deliverables" && <DeliverablesView router={router} />}
    </SiteWalkV1Shell>
  );
}

function shellTitle(tab: V1NavTab, orgName: string | null): string {
  switch (tab) {
    case "home":
      return orgName ? `${orgName} · Site Walk` : "Site Walk";
    case "worksites":
      return "Worksites";
    case "slatedrop":
      return "SlateDrop";
    case "coordination":
      return "Coordination";
    case "deliverables":
      return "Deliverables";
  }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ================================================================
   HOME
   ================================================================ */

type RouterLike = ReturnType<typeof useRouter>;

function HomeView({
  walks,
  projects,
  summary,
  router,
  setTab,
}: {
  walks: HubWalk[];
  projects: HubProject[];
  summary: HubSummary;
  router: RouterLike;
  setTab: (t: V1NavTab) => void;
}) {
  const recentWalks = walks.slice(0, 20);

  /* Build worksite stats for the Worksites tab inside the work panel */
  const walksByProject = new Map<string, number>();
  const lastActivityByProject = new Map<string, string>();
  for (const w of walks) {
    if (!w.projectId) continue;
    walksByProject.set(w.projectId, (walksByProject.get(w.projectId) ?? 0) + 1);
    const prev = lastActivityByProject.get(w.projectId);
    if (!prev || w.updatedAt > prev) lastActivityByProject.set(w.projectId, w.updatedAt);
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Command zone ── */}
      <div className="shrink-0">
        {/* Module label */}
        <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-amber-500/80">
          Site Walk
        </p>

        <SiteWalkV1ActionGrid
          onNewWorksite={() => router.push("/site-walk/setup")}
          onStartWalk={() => router.push("/site-walk/setup")}
          onQuickCapture={() => router.push("/site-walk/capture?quick=1")}
        />

        {/* Core tools row */}
        <div className="grid grid-cols-3 gap-2.5 px-4 pb-2">
          <ToolCard icon={FolderOpen} label="SlateDrop" onClick={() => setTab("slatedrop")} />
          <ToolCard icon={MessageSquare} label="Coordination" onClick={() => setTab("coordination")} />
          <ToolCard icon={Package} label="Deliverables" onClick={() => setTab("deliverables")} />
        </div>
      </div>

      {/* ── Work panel: anchored near bottom, controlled height ── */}
      <SiteWalkV1ListPanel
        className="mt-auto mb-3 h-[34dvh] min-h-[245px] max-h-[320px] shrink-0"
        recentContent={
          recentWalks.length > 0 ? (
            <WalkList walks={recentWalks} router={router} />
          ) : (
            <EmptyList message="No recent walks. Start a walk or quick capture to see activity here." />
          )
        }
        worksitesContent={
          projects.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {projects.map((p) => (
                <WorksiteV1Row
                  key={p.id}
                  name={p.name}
                  walkCount={walksByProject.get(p.id) ?? 0}
                  lastActivity={timeAgo(lastActivityByProject.get(p.id) ?? null)}
                  onOpen={() => router.push(`/projects/${p.id}`)}
                  onStartWalk={() => router.push("/site-walk/setup")}
                  onPlansAndDocs={() => router.push(`/projects/${p.id}/slatedrop`)}
                  onSlateDrop={() => router.push(`/projects/${p.id}/slatedrop`)}
                  onCollaborators={() => router.push(`/projects/${p.id}/people`)}
                  onDeliverables={() => router.push("/site-walk/deliverables")}
                />
              ))}
            </div>
          ) : (
            <EmptyList message="No worksites yet. Create a worksite to get started." />
          )
        }
        sharedContent={<EmptyList message="No shared work yet." />}
        reviewContent={
          summary.needsReview > 0 ? (
            <EmptyList
              message={`${summary.needsReview} item${summary.needsReview === 1 ? "" : "s"} need review. Open a walk to review resolved items.`}
            />
          ) : (
            <EmptyList message="Nothing needs review." />
          )
        }
      />
    </div>
  );
}

function WalkList({ walks, router }: { walks: HubWalk[]; router: RouterLike }) {
  return (
    <div className="flex flex-col gap-1.5">
      {walks.map((w) => (
        <WalkV1Row
          key={w.id}
          title={w.title}
          worksiteName={w.projectName}
          status={w.status}
          itemCount={w.itemCount}
          lastUpdated={timeAgo(w.updatedAt)}
          onOpen={() => router.push(`/site-walk/walks/${w.id}`)}
          onCreateReport={() =>
            router.push(`/site-walk/deliverables?session=${w.id}`)
          }
        />
      ))}
    </div>
  );
}

function ToolCard({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FolderOpen;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 items-center gap-2.5 rounded-xl border border-white/6 bg-zinc-900/60 px-3 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-200 active:bg-zinc-800"
    >
      <Icon className="size-5 shrink-0 text-zinc-500" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ================================================================
   WORKSITES
   ================================================================ */

function WorksitesView({
  projects,
  walks,
  router,
}: {
  projects: HubProject[];
  walks: HubWalk[];
  router: RouterLike;
}) {
  const walksByProject = new Map<string, number>();
  const lastActivityByProject = new Map<string, string>();
  for (const w of walks) {
    if (!w.projectId) continue;
    walksByProject.set(w.projectId, (walksByProject.get(w.projectId) ?? 0) + 1);
    const existing = lastActivityByProject.get(w.projectId);
    if (!existing || w.updatedAt > existing) {
      lastActivityByProject.set(w.projectId, w.updatedAt);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">
          All Worksites ({projects.length})
        </p>
        <Button
          size="sm"
          className="gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          onClick={() => router.push("/site-walk/setup")}
        >
          <Plus className="size-3.5" />
          New Worksite
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyList message="No worksites yet. Create a worksite to organize plans, captures, deliverables, and team collaboration." />
      ) : (
        <div className="flex flex-col gap-1.5">
          {projects.map((p) => (
            <WorksiteV1Row
              key={p.id}
              name={p.name}
              walkCount={walksByProject.get(p.id) ?? 0}
              lastActivity={timeAgo(lastActivityByProject.get(p.id) ?? null)}
              onOpen={() => router.push(`/projects/${p.id}`)}
              onStartWalk={() =>
                router.push(`/site-walk/setup`)
              }
              onPlansAndDocs={() =>
                router.push(`/projects/${p.id}/slatedrop`)
              }
              onSlateDrop={() =>
                router.push(`/projects/${p.id}/slatedrop`)
              }
              onCollaborators={() =>
                router.push(`/projects/${p.id}/people`)
              }
              onDeliverables={() =>
                router.push(`/site-walk/deliverables`)
              }
              onRename={() => {}}
              onArchive={() => {}}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SLATEDROP
   ================================================================ */

function SlateDropView({
  projects,
  router,
}: {
  projects: HubProject[];
  router: RouterLike;
}) {
  const sections: {
    icon: typeof FolderOpen;
    label: string;
    href: string;
  }[] = [
    { icon: FolderOpen, label: "All Files", href: "/slatedrop" },
    { icon: Upload, label: "Recent Uploads", href: "/slatedrop" },
    { icon: Share2, label: "Shared Drops", href: "/slatedrop" },
    { icon: LinkIcon, label: "File Requests", href: "/slatedrop" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-2">
        {sections.map(({ icon: Icon, label, href }) => (
          <button
            key={label}
            type="button"
            onClick={() => router.push(href)}
            className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
          >
            <Icon className="size-4 shrink-0 text-zinc-500" />
            {label}
          </button>
        ))}
      </div>

      {/* Project folder shortcuts */}
      {projects.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">
            Worksite folders
          </p>
          <div className="flex flex-col gap-1.5">
            {projects.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => router.push(`/projects/${p.id}/slatedrop`)}
                className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.06]"
              >
                <FolderOpen className="size-4 shrink-0 text-amber-500/60" />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <EmptyList message="No SlateDrop folders yet. Create a Worksite to organize plans, photos, captures, deliverables, and shared files." />
      )}
    </div>
  );
}

/* ================================================================
   COORDINATION
   ================================================================ */

function CoordinationView({ router }: { router: RouterLike }) {
  const sections: {
    icon: typeof ClipboardList;
    label: string;
    desc: string;
    href: string;
  }[] = [
    {
      icon: Inbox,
      label: "Inbox",
      desc: "Items needing your attention",
      href: "/coordination/inbox",
    },
    {
      icon: ClipboardList,
      label: "Assignments",
      desc: "Field-to-office task assignments",
      href: "/site-walk/assigned-work",
    },
    {
      icon: MessageSquare,
      label: "Comments",
      desc: "Threaded discussions on walks and items",
      href: "/coordination/inbox",
    },
    {
      icon: BookUser,
      label: "Contacts",
      desc: "Project directory and stakeholders",
      href: "/coordination/contacts",
    },
    {
      icon: Users,
      label: "Calendar",
      desc: "Events and schedule",
      href: "/coordination/calendar",
    },
    {
      icon: Mail,
      label: "Invitations",
      desc: "Pending collaborator invitations",
      href: "/settings",
    },
  ];

  return (
    <div className="flex flex-col gap-2 p-4">
      {sections.map(({ icon: Icon, label, desc, href }) => (
        <button
          key={label}
          type="button"
          onClick={() => router.push(href)}
          className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:bg-white/[0.06]"
        >
          <Icon className="mt-0.5 size-4 shrink-0 text-zinc-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200">{label}</p>
            <p className="text-xs text-zinc-500">{desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ================================================================
   DELIVERABLES
   ================================================================ */

function DeliverablesView({ router }: { router: RouterLike }) {
  const categories: { icon: typeof FileText; label: string }[] = [
    { icon: Eye, label: "Visual Walk Summary" },
    { icon: CheckSquare, label: "Punch / Issue Package" },
    { icon: FileText, label: "Proposal Package" },
    { icon: Camera, label: "Before & After" },
    { icon: Clock, label: "Progress Timeline" },
    { icon: Globe, label: "360 Tour" },
    { icon: CuboidIcon, label: "3D Model Review" },
    { icon: Package, label: "Closeout Record" },
    { icon: FileDown, label: "PDF Export" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">Deliverables</p>
        <Button
          size="sm"
          className="gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          onClick={() => router.push("/site-walk/deliverables")}
        >
          <Plus className="size-3.5" />
          Create Deliverable
        </Button>
      </div>

      {/* Category chips */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">
          Deliverable types
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => router.push("/site-walk/deliverables")}
              className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-amber-500/20 hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/site-walk/deliverables")}
        className="mt-2 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.06]"
      >
        View all deliverables →
      </button>
    </div>
  );
}

/* ================================================================
   SHARED UI
   ================================================================ */

function EmptyList({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-white/5 py-8">
      <p className="max-w-[260px] text-center text-xs text-zinc-600">
        {message}
      </p>
    </div>
  );
}
