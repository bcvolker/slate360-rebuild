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
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 overflow-y-auto px-1 pb-3 no-scrollbar">
      <AppsGrid entitlements={entitlements} />
      <section className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-lg backdrop-blur-md">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Quick actions">
          <ActionCard href="/site-walk" label="Start Walk" icon={<Plus className="h-5 w-5" />} />
          <ActionCard href="/projects" label="Projects" icon={<FolderOpen className="h-5 w-5" />} />
          <ActionCard href="/slatedrop" label="Files" icon={<Files className="h-5 w-5" />} />
          <ActionCard href="/coordination/inbox" label="Inbox" icon={<MessageSquare className="h-5 w-5" />} />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-lg backdrop-blur-md">
        <SectionHeader title="Recent Walks" href="/site-walk/walks" />
        <ListCard href="/site-walk/walks" label="Open walks" detail="Review active and completed Site Walk sessions." icon={<ClipboardCheck className="h-4 w-4" />} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-lg backdrop-blur-md">
        <SectionHeader title="Inbox" href="/coordination/inbox" />
        <ListCard href="/coordination/inbox" label="Messages" detail="Files, comments, stakeholder replies, and alerts." icon={<MessageSquare className="h-4 w-4" />} />
      </section>
    </div>
  );
}

function ActionCard({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-20 flex-col justify-between rounded-2xl border border-white/12 bg-slate-900/70 p-3 text-left text-white shadow-sm transition-all duration-200 hover:border-blue-400/70 hover:bg-blue-500/15"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">{icon}</span>
      <span className="text-sm font-black">{label}</span>
    </Link>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-black text-white">{title}</h2><Link href={href} className="text-xs font-black text-blue-200">View</Link></div>;
}

function ListCard({ href, label, detail, icon }: { href: string; label: string; detail: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/12 bg-slate-900/70 p-3 text-left transition hover:border-blue-400/70 hover:bg-blue-500/15">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">{icon}</span>
      <span className="min-w-0">
        <p className="text-sm font-black text-slate-50">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
      </span>
    </Link>
  );
}
