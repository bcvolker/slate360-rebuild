"use client";

import Link from "next/link";
import type React from "react";
import {
  Cloud,
  FolderOpen,
  MessageSquare,
  User,
  CalendarDays,
  Users,
} from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import { AppsGrid } from "@/components/dashboard/command-center/AppsGrid";
import GlassCard from "@/components/shared/GlassCard";

export interface DashboardUpcomingEvent {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  color: string | null;
}

export interface DashboardRecentContact {
  id: string;
  name: string;
  company: string | null;
  title: string | null;
  initials: string;
  color: string;
}

interface CommandCenterContentProps {
  userName: string;
  orgName: string;
  storageLimitGb: number;
  entitlements?: Entitlements | null;
  upcomingEvents?: DashboardUpcomingEvent[];
  recentContacts?: DashboardRecentContact[];
}

function formatEventDate(dateStr: string, startTime: string | null): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return startTime ? `${label} · ${startTime.slice(0, 5)}` : label;
}

export function CommandCenterContent({
  entitlements = null,
  upcomingEvents = [],
  recentContacts = [],
}: CommandCenterContentProps) {
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

      {/* Data widgets row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Upcoming Schedule */}
        <GlassCard className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/70">Upcoming Schedule</p>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="py-2 text-center text-xs text-slate-500">No upcoming events</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {upcomingEvents.map((ev) => (
                <Link
                  key={ev.id}
                  href="/calendar"
                  className="flex items-center gap-2.5 rounded-xl bg-slate-900/50 p-2 transition-colors hover:bg-white/10"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: ev.color ?? "#f59e0b" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{ev.title}</p>
                    <p className="text-xs text-slate-400">{formatEventDate(ev.date, ev.start_time)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Recent Contacts */}
        <GlassCard className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/70">Recent Contacts</p>
          </div>
          {recentContacts.length === 0 ? (
            <p className="py-2 text-center text-xs text-slate-500">No contacts yet</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {recentContacts.map((c) => (
                <Link
                  key={c.id}
                  href="/contacts"
                  className="flex items-center gap-2.5 rounded-xl bg-slate-900/50 p-2 transition-colors hover:bg-white/10"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: c.color ?? "#1e293b" }}
                  >
                    {c.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{c.name}</p>
                    <p className="truncate text-xs text-slate-400">{c.company ?? c.title ?? ""}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
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
