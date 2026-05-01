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

export function CommandCenterContent({ storageLimitGb, entitlements = null }: CommandCenterContentProps) {
  return (
    <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[36%_14%_minmax(0,1fr)] gap-2 overflow-hidden lg:gap-3">
      <AppsGrid entitlements={entitlements} />
      <section className="min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2 shadow-lg backdrop-blur-md lg:p-3">
        <div className="flex h-full gap-2 overflow-x-auto no-scrollbar" aria-label="Global shortcut carousel">
          <ResumeCard href="/projects" label="Active Projects" detail="Open field project management" icon={<FolderOpen className="h-5 w-5" />} />
          <ResumeCard href="/slatedrop" label="Recent Files" detail={`${storageLimitGb}GB SlateDrop workspace`} icon={<Files className="h-5 w-5" />} />
          <ResumeCard href="/site-walk/deliverables" label="Draft Deliverables" detail="Reports, proposals, and outputs" icon={<FileText className="h-5 w-5" />} />
          <ResumeCard href="/my-work" label="My Work" detail="Tasks, reviews, and approvals" icon={<ClipboardCheck className="h-5 w-5" />} />
          <ResumeCard href="/coordination" label="Coordination" detail="Messages, contacts, and notifications" icon={<MessageSquare className="h-5 w-5" />} />
          <ResumeCard href="/settings" label="Settings" detail="Branding, colors, team, billing" icon={<Settings className="h-5 w-5" />} />
          <ResumeCard href="/projects" label="New Project" detail="Create a shared workspace" icon={<Plus className="h-5 w-5" />} />
        </div>
      </section>
      <section className="min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2 shadow-lg backdrop-blur-md lg:p-3">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Workspace tray</p>
          <Link href="/coordination" className="rounded-full border border-white/15 px-3 py-1 text-xs font-black text-slate-200 hover:border-blue-400 hover:text-blue-100">Open</Link>
        </div>
        <div className="grid h-[calc(100%-32px)] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 no-scrollbar" aria-label="Contained workspace tray">
          <TrayCard href="/my-work" label="Work queue" detail="Tasks, approvals, and reviews will surface here." icon={<ClipboardCheck className="h-4 w-4" />} />
          <TrayCard href="/coordination/inbox" label="Inbox" detail="Unread threads and stakeholder responses stay contained here." icon={<MessageSquare className="h-4 w-4" />} />
          <TrayCard href="/slatedrop" label="File activity" detail="Recent SlateDrop uploads and shared files will appear here." icon={<Files className="h-4 w-4" />} />
          <TrayCard href="/settings" label="Setup" detail="Branding, colors, organization, and subscription controls." icon={<Settings className="h-4 w-4" />} />
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
      className="flex h-full min-w-[150px] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-left text-slate-50 shadow-sm transition-all duration-200 hover:border-blue-400/70 hover:bg-blue-500/10 lg:min-w-[190px]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">{icon}</span>
      <span className="min-w-0">
        <p className="text-sm font-black">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-400">{detail}</p>
      </span>
    </Link>
  );
}

function TrayCard({ href, label, detail, icon }: { href: string; label: string; detail: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-16 items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-left transition hover:border-blue-400/70 hover:bg-blue-500/10">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">{icon}</span>
      <span className="min-w-0">
        <p className="text-sm font-black text-slate-50">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
      </span>
    </Link>
  );
}
