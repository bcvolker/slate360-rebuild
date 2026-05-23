"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardV3Sidebar } from "./DashboardV3Sidebar";
import { DashboardV3Topbar } from "./DashboardV3Topbar";
import { DashboardV3Hero } from "./DashboardV3Hero";
import { DashboardV3ContinueWorkRail } from "./DashboardV3ContinueWorkRail";
import { DashboardV3ProcessingQueue } from "./DashboardV3ProcessingQueue";
import { DashboardV3StorageBilling } from "./DashboardV3StorageBilling";

export type DashboardV3Data = {
  roleName?: string;
  alerts?: unknown[];
  latestProject?: { id?: string; name?: string; created_at?: string } | null;
  recentProjects?: { id?: string; name?: string; created_at?: string }[];
  recentWalks?: { id?: string; name?: string; created_at?: string }[];
  myWork?: { id?: string; name?: string; created_at?: string }[];
  coordinationAlerts?: unknown[];
  processingJobs?: {
    id?: string;
    filename?: string;
    status?: string;
    processing_progress?: number;
    created_at?: string;
  }[];
  usage?: {
    storageGbUsed: string;
    storageGbLimit: number;
  } | null;
};

type DashboardV3ShellProps = {
  data: DashboardV3Data;
};

export function DashboardV3Shell({ data }: DashboardV3ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-[100dvh] bg-[#0B0F15] text-slate-200">
      <div
        className={cn(
          "shrink-0 overflow-hidden border-r border-white/[0.05] bg-[#0B0F15] transition-[width] duration-200",
          sidebarOpen ? "w-[270px]" : "w-0",
        )}
      >
        <div className="w-[270px]">
          <DashboardV3Sidebar />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            className="absolute left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-white/[0.05] bg-[#131820] text-zinc-400 transition-colors hover:border-white/10 hover:text-white"
            aria-label={sidebarOpen ? "Collapse navigation" : "Expand navigation"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
          <DashboardV3Topbar roleName={data.roleName ?? "Member"} />
        </div>

        <main className="flex-1 space-y-8 overflow-y-auto p-7">
          <DashboardV3Hero project={data.latestProject ?? null} />

          <DashboardV3ContinueWorkRail
            projects={data.recentProjects ?? []}
            walks={data.recentWalks ?? []}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardV3ProcessingQueue jobs={data.processingJobs ?? []} />
            <DashboardV3StorageBilling usage={data.usage ?? null} />
          </div>
        </main>
      </div>
    </div>
  );
}
