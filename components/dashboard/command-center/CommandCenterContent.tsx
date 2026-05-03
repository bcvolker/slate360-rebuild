"use client";

import Link from "next/link";
import type React from "react";
import {
  Cloud,
  FolderOpen,
  MessageSquare,
  User,
} from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import { AppsGrid } from "@/components/dashboard/command-center/AppsGrid";
import GlassCard from "@/components/shared/GlassCard";

interface CommandCenterContentProps {
  userName: string;
  orgName: string;
  storageLimitGb: number;
  entitlements?: Entitlements | null;
}

export function CommandCenterContent({ entitlements = null }: CommandCenterContentProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 overflow-y-auto px-1 pb-3 no-scrollbar">
      {/* Apps — launch any app you are subscribed to */}
      <AppsGrid entitlements={entitlements} />

      {/* Platform quick actions — same for every user, no app-specific content */}
      <GlassCard className="p-3">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/70">Quick Access</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Quick actions">
          <ActionCard href="/projects" label="Projects" icon={<FolderOpen className="h-5 w-5" />} />
          <ActionCard href="/slatedrop" label="Files" icon={<Cloud className="h-5 w-5" />} />
          <ActionCard href="/coordination/inbox" label="Inbox" icon={<MessageSquare className="h-5 w-5" />} />
          <ActionCard href="/more" label="Account" icon={<User className="h-5 w-5" />} />
        </div>
      </GlassCard>
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
      className="flex min-h-20 flex-col justify-between rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3 text-left text-white shadow-sm transition-all duration-200 hover:border-amber-400/50 hover:bg-amber-500/10"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950">{icon}</span>
      <span className="text-sm font-black">{label}</span>
    </Link>
  );
}
