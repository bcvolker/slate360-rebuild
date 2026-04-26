"use client";

import Link from "next/link";
import { useState } from "react";
import type React from "react";
import { Input } from "@/components/ui/input";
import {
  Command,
  FileText,
  Files,
  FolderOpen,
  MessageSquare,
  Plus,
  Rocket,
  Search,
} from "lucide-react";
import {
  SlateContainedSection,
  SlateSubtleToggle,
} from "@/lib/design-system";
import type { Entitlements } from "@/lib/entitlements";
import { AppsGrid } from "@/components/dashboard/command-center/AppsGrid";

interface CommandCenterContentProps {
  userName: string;
  orgName: string;
  storageLimitGb: number;
  entitlements?: Entitlements | null;
}

export function CommandCenterContent({ userName, orgName, storageLimitGb, entitlements = null }: CommandCenterContentProps) {
  const [query, setQuery] = useState("");
  const hasAnyApp = Boolean(
    entitlements?.canAccessStandalonePunchwalk ||
    entitlements?.canAccessStandaloneTourBuilder ||
    entitlements?.canAccessStandaloneDesignStudio ||
    entitlements?.canAccessStandaloneContentStudio,
  );
  const [projectView, setProjectView] = useState(hasAnyApp ? "Pinned" : "Assigned Tasks");
  const [recentView, setRecentView] = useState("In-Progress");
  const [communicationsView, setCommunicationsView] = useState("Unread Threads");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {orgName || userName || "Slate360"}
        </p>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          {userName ? `Welcome back, ${userName.split(" ")[0]}` : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Jump into your projects, apps, and recent work.
        </p>
      </section>

      {/* Search */}
      <section className="surface-raised p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search everything in Slate360"
            className="rounded-2xl pl-10 text-sm"
          />
        </div>
      </section>

      {/* Apps */}
      <AppsGrid entitlements={entitlements} />

      <section className="surface-raised p-4 sm:p-5">
        <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <QuickAction href="/dashboard" label="Quick Start" detail="Launch any subscribed app" icon={<Rocket className="h-5 w-5" />} primary />
          <QuickAction href="/projects" label="New Project" detail="Create a shared workspace" icon={<Plus className="h-5 w-5" />} />
          <QuickAction href="/slatedrop" label="Open SlateDrop" detail={`${storageLimitGb}GB file hub`} icon={<Files className="h-5 w-5" />} />
          <QuickAction href="/dashboard" label="Search Everything" detail="Projects, tasks, files" icon={<Command className="h-5 w-5" />} />
        </div>
      </section>

      <section className="surface-raised p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Projects &amp; Tasks</h2>
          </div>
          <SlateSubtleToggle
            options={["Pinned", "All", "Assigned Tasks"]}
            active={projectView}
            onChange={setProjectView}
          />
        </div>
        <SlateContainedSection maxHeight="200px">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 text-center">
            {projectView === "Assigned Tasks" ? "No assigned tasks yet." : projectView === "Pinned" ? "No pinned projects yet." : "No projects to show yet."}
          </div>
        </SlateContainedSection>
      </section>

      <section className="surface-raised p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Work &amp; Drafts</h2>
          </div>
          <SlateSubtleToggle
            options={["In-Progress", "Completed"]}
            active={recentView}
            onChange={setRecentView}
          />
        </div>
        <SlateContainedSection maxHeight="280px">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 text-center">
            {recentView === "In-Progress" ? "No in-progress work yet." : "No completed work yet."}
          </div>
        </SlateContainedSection>
      </section>

      <section className="surface-raised p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900">Communications</h2>
          </div>
          <SlateSubtleToggle
            options={["Unread Threads", "Recent Contacts"]}
            active={communicationsView}
            onChange={setCommunicationsView}
          />
        </div>
        <SlateContainedSection maxHeight="240px">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 text-center">
            {communicationsView === "Unread Threads" ? "No unread threads yet." : "No recent contacts yet."}
          </div>
        </SlateContainedSection>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  label,
  detail,
  icon,
  primary = false,
}: {
  href: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`min-h-[104px] rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 ${primary ? "border-blue-700 bg-blue-600 text-white shadow-blue-600/20" : "border-slate-300 bg-white text-slate-900 hover:border-blue-600"}`}
    >
      {icon}
      <p className="mt-3 text-sm font-black">{label}</p>
      <p className={`mt-1 text-xs ${primary ? "text-blue-100" : "text-slate-600"}`}>{detail}</p>
    </Link>
  );
}
