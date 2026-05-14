"use client";

import { useState } from "react";
import { SiteWalkV1Shell } from "@/components/site-walk/v1/SiteWalkV1Shell";
import { SiteWalkV1ActionGrid } from "@/components/site-walk/v1/SiteWalkV1ActionGrid";
import { SiteWalkV1ListPanel } from "@/components/site-walk/v1/SiteWalkV1ListPanel";
import { PlanWorkspaceV1Skeleton } from "@/components/site-walk/v1/PlanWorkspaceV1Skeleton";
import { CaptureWorkspaceV1Skeleton } from "@/components/site-walk/v1/CaptureWorkspaceV1Skeleton";
import type { V1NavTab } from "@/components/site-walk/v1/SiteWalkV1BottomNav";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Upload,
  Share2,
  Link,
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

type PreviewScreen = "shell" | "plan" | "capture";

export default function SiteWalkV1PreviewPage() {
  const [tab, setTab] = useState<V1NavTab>("home");
  const [screen, setScreen] = useState<PreviewScreen>("shell");

  if (screen === "plan") {
    return (
      <PlanWorkspaceV1Skeleton
        worksiteName="Main Building"
        walkTitle="Foundation Inspection"
        onBack={() => setScreen("shell")}
      />
    );
  }

  if (screen === "capture") {
    return (
      <CaptureWorkspaceV1Skeleton
        onBack={() => setScreen("plan")}
        onStopContext={() => {}}
        onExit={() => setScreen("shell")}
      />
    );
  }

  return (
    <SiteWalkV1Shell
      title={shellTitle(tab)}
      activeTab={tab}
      onTabChange={setTab}
    >
      {tab === "home" && (
        <HomeView
          onOpenPlan={() => setScreen("plan")}
          onOpenCapture={() => setScreen("capture")}
        />
      )}
      {tab === "worksites" && <WorksitesView />}
      {tab === "slatedrop" && <SlateDropView />}
      {tab === "coordination" && <CoordinationView />}
      {tab === "deliverables" && <DeliverablesView />}
    </SiteWalkV1Shell>
  );
}

function shellTitle(tab: V1NavTab): string {
  switch (tab) {
    case "home":
      return "Site Walk";
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

/* ================================================================
   HOME
   ================================================================ */

function HomeView({
  onOpenPlan,
  onOpenCapture,
}: {
  onOpenPlan: () => void;
  onOpenCapture: () => void;
}) {
  return (
    <div className="flex flex-col">
      {/* Primary actions */}
      <SiteWalkV1ActionGrid
        onNewWorksite={() => {}}
        onStartWalk={() => {}}
        onQuickCapture={onOpenCapture}
      />

      {/* Core access row */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <CoreAccessButton icon={FolderOpen} label="SlateDrop" />
        <CoreAccessButton icon={MessageSquare} label="Coordination" />
        <CoreAccessButton icon={Package} label="Deliverables" />
      </div>

      {/* Work panel */}
      <SiteWalkV1ListPanel
        recentContent={<EmptyList message="No recent walks" />}
        activeContent={<EmptyList message="No active walks" />}
        sharedContent={<EmptyList message="Nothing shared with you yet" />}
        reviewContent={<EmptyList message="No items need review" />}
      />
    </div>
  );
}

function CoreAccessButton({
  icon: Icon,
  label,
}: {
  icon: typeof FolderOpen;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ================================================================
   WORKSITES
   ================================================================ */

function WorksitesView() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">All Worksites</p>
        <Button
          size="sm"
          className="gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
        >
          <Plus className="size-3.5" />
          New Worksite
        </Button>
      </div>
      <EmptyList message="No worksites yet. Create a worksite to organize plans, captures, deliverables, and team collaboration." />
    </div>
  );
}

/* ================================================================
   SLATEDROP
   ================================================================ */

function SlateDropView() {
  const sections: { icon: typeof FolderOpen; label: string }[] = [
    { icon: FolderOpen, label: "Worksite Folders" },
    { icon: Upload, label: "Recent Uploads" },
    { icon: Share2, label: "Shared Drops" },
    { icon: Link, label: "File Requests" },
  ];

  const autoFolders = [
    "Plans",
    "Photos",
    "Captures",
    "Walk Data",
    "Attachments",
    "Deliverables",
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Section links */}
      <div className="grid grid-cols-2 gap-2">
        {sections.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-3 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
          >
            <Icon className="size-4 shrink-0 text-zinc-500" />
            {label}
          </button>
        ))}
      </div>

      {/* Auto-folder concept */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">
          Auto-organized folders per worksite
        </p>
        <div className="flex flex-wrap gap-1.5">
          {autoFolders.map((f) => (
            <span
              key={f}
              className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-500"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      <EmptyList message="No SlateDrop folders yet. Create a Worksite to organize plans, photos, captures, deliverables, and shared files." />
    </div>
  );
}

/* ================================================================
   COORDINATION
   ================================================================ */

function CoordinationView() {
  const sections: { icon: typeof ClipboardList; label: string; desc: string }[] =
    [
      {
        icon: ClipboardList,
        label: "Assignments",
        desc: "Field-to-office task assignments",
      },
      {
        icon: MessageSquare,
        label: "Comments",
        desc: "Threaded discussions on walks and items",
      },
      {
        icon: Inbox,
        label: "Inbox",
        desc: "Items needing your attention",
      },
      {
        icon: Users,
        label: "Shared With Me",
        desc: "Worksites and walks shared by others",
      },
      {
        icon: Mail,
        label: "Invitations",
        desc: "Pending collaborator invitations",
      },
      {
        icon: BookUser,
        label: "Contacts",
        desc: "Project directory and stakeholders",
      },
    ];

  return (
    <div className="flex flex-col gap-2 p-4">
      {sections.map(({ icon: Icon, label, desc }) => (
        <button
          key={label}
          type="button"
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

function DeliverablesView() {
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
              className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-amber-500/20 hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Status sections */}
      <div className="space-y-3">
        <SectionHeader label="Draft Deliverables" />
        <EmptyList message="No drafts" />

        <SectionHeader label="Published Links" />
        <EmptyList message="No published deliverables" />

        <SectionHeader label="Shared Deliverables" />
        <EmptyList message="No shared deliverables" />
      </div>

      <EmptyList message="No deliverables yet. Select a walk or captured stops to build a visual deliverable." />
    </div>
  );
}

/* ================================================================
   SHARED UI
   ================================================================ */

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
      {label}
    </p>
  );
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-white/5 py-8">
      <p className="max-w-[260px] text-center text-xs text-zinc-600">
        {message}
      </p>
    </div>
  );
}
