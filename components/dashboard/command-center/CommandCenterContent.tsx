"use client";

import Link from "next/link";
import type React from "react";
import {
  ClipboardCheck,
  FileText,
  Files,
  FolderOpen,
  MessageSquare,
  Plus,
  Settings,
} from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import { AppsGrid } from "@/components/dashboard/command-center/AppsGrid";

interface CommandCenterContentProps {
  userName: string;
  orgName: string;
  storageLimitGb: number;
  entitlements?: Entitlements | null;
}

export function CommandCenterContent({ userName, orgName, storageLimitGb, entitlements = null }: CommandCenterContentProps) {
  return (
    <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[minmax(190px,0.52fr)_minmax(0,1fr)] gap-3 overflow-hidden lg:grid-rows-[minmax(230px,0.5fr)_minmax(0,1fr)]">
      <AppsGrid entitlements={entitlements} />
      <section className="min-h-0 overflow-hidden rounded-3xl border border-slate-300 bg-white p-3 shadow-sm lg:p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Quick resume</p>
            <h1 className="truncate text-sm font-black text-slate-950 lg:text-lg">{orgName || userName || "Slate360"}</h1>
          </div>
          <Link href="/more" className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-black text-slate-700 hover:border-blue-500 hover:text-blue-700">More</Link>
        </div>
        <div className="flex h-[calc(100%-52px)] gap-3 overflow-x-auto pb-1 no-scrollbar" aria-label="Global activity and quick resume carousel">
          <ResumeCard href="/projects" label="Active Projects" detail="Open field project management" icon={<FolderOpen className="h-5 w-5" />} />
          <ResumeCard href="/slatedrop" label="Recent Files" detail={`${storageLimitGb}GB SlateDrop workspace`} icon={<Files className="h-5 w-5" />} />
          <ResumeCard href="/site-walk/deliverables" label="Draft Deliverables" detail="Reports, proposals, and outputs" icon={<FileText className="h-5 w-5" />} />
          <ResumeCard href="/my-work" label="My Work" detail="Tasks, reviews, and approvals" icon={<ClipboardCheck className="h-5 w-5" />} />
          <ResumeCard href="/coordination" label="Coordination" detail="Messages, contacts, and notifications" icon={<MessageSquare className="h-5 w-5" />} />
          <ResumeCard href="/settings" label="Settings" detail="Branding, colors, team, billing" icon={<Settings className="h-5 w-5" />} />
          <ResumeCard href="/projects" label="New Project" detail="Create a shared workspace" icon={<Plus className="h-5 w-5" />} />
        </div>
      </section>
    </div>
  );
}

function ResumeCard({
  href,
  label,
  detail,
  icon,
}: {
  href: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex h-full min-w-[180px] flex-col justify-between rounded-2xl border border-slate-300 bg-slate-50 p-4 text-left text-slate-900 shadow-sm transition-all duration-200 hover:border-blue-600 hover:bg-blue-50 lg:min-w-[220px]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">{icon}</span>
      <span>
        <p className="text-sm font-black">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
      </span>
    </Link>
  );
}
