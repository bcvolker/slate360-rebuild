"use client";

import Link from "next/link";
import type React from "react";
import {
  ClipboardCheck,
  Files,
  FolderOpen,
  MessageSquare,
  Plus,
  MapPin,
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

export function CommandCenterContent({ storageLimitGb, entitlements = null }: CommandCenterContentProps) {
  const hasSiteWalk = entitlements?.canAccessStandalonePunchwalk ?? false;

  // The 4th quick action adapts to the user's active app subscription.
  // When Site Walk access is confirmed, show "New Walk". Otherwise show
  // a neutral "New Project" so non-Site-Walk users are never confused.
  const primaryAction = hasSiteWalk
    ? { href: "/site-walk/setup", label: "New Walk", icon: <MapPin className="h-5 w-5" /> }
    : { href: "/projects", label: "New Project", icon: <Plus className="h-5 w-5" /> };

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 overflow-y-auto px-1 pb-3 no-scrollbar">
      <AppsGrid entitlements={entitlements} />

      {/* Quick actions — app-neutral core actions + one entitlement-aware primary CTA */}
      <GlassCard className="p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Quick actions">
          <ActionCard href={primaryAction.href} label={primaryAction.label} icon={primaryAction.icon} />
          <ActionCard href="/projects" label="Projects" icon={<FolderOpen className="h-5 w-5" />} />
          <ActionCard href="/slatedrop" label="Files" icon={<Files className="h-5 w-5" />} />
          <ActionCard href="/coordination/inbox" label="Inbox" icon={<MessageSquare className="h-5 w-5" />} />
        </div>
      </GlassCard>

      {/* Recent Activity — only render Site Walk walk list when user has Site Walk access */}
      {hasSiteWalk && (
        <GlassCard className="p-3">
          <SectionHeader title="Recent Walks" href="/site-walk/walks" />
          <div className="max-h-[320px] overflow-y-auto rounded-xl no-scrollbar">
            <ListCard
              href="/site-walk/walks"
              label="Open walks"
              detail="Review active and completed Site Walk sessions."
              icon={<ClipboardCheck className="h-4 w-4" />}
            />
          </div>
        </GlassCard>
      )}

      {/* Inbox — always visible, constrained height */}
      <GlassCard className="p-3">
        <SectionHeader title="Inbox" href="/coordination/inbox" />
        <div className="max-h-[320px] overflow-y-auto rounded-xl no-scrollbar">
          <ListCard
            href="/coordination/inbox"
            label="Messages"
            detail="Files, comments, stakeholder replies, and alerts."
            icon={<MessageSquare className="h-4 w-4" />}
          />
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

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-black text-white">{title}</h2>
      <Link href={href} className="text-xs font-black text-amber-300">View</Link>
    </div>
  );
}

function ListCard({ href, label, detail, icon }: { href: string; label: string; detail: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3 text-left transition hover:border-amber-400/50 hover:bg-amber-500/10">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950">{icon}</span>
      <span className="min-w-0">
        <p className="text-sm font-black text-slate-50">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
      </span>
    </Link>
  );
}
