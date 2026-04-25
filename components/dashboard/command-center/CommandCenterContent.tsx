"use client";

import Link from "next/link";
import {
  MapPin,
  FolderPlus,
  UserPlus,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Footprints,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Entitlements } from "@/lib/entitlements";

/* ─────────────────────── demo data ─────────────────────── */

const QUICK_ACTIONS = [
  {
    id: "walk",
    label: "Start Ad-Hoc Walk",
    description: "Capture punch items on-site right now",
    icon: Footprints,
    href: "/site-walk",
    variant: "primary" as const,
  },
  {
    id: "project",
    label: "New Project",
    description: "Set up a new job site or project",
    icon: FolderPlus,
    href: "/projects/new",
    variant: "default" as const,
  },
  {
    id: "stakeholder",
    label: "Add Stakeholder",
    description: "Invite a client, sub, or team member",
    icon: UserPlus,
    href: "/directory/new",
    variant: "default" as const,
  },
  {
    id: "report",
    label: "Generate Report",
    description: "Export a progress or punch-list report",
    icon: ArrowRight,
    href: "/reports",
    variant: "default" as const,
  },
];

const ACTIVE_PROJECTS = [
  {
    id: "1",
    name: "Riverfront Tower — Phase 2",
    location: "Austin, TX",
    progress: 68,
    status: "on-track" as const,
    dueDate: "Jun 14, 2026",
    team: ["JD", "KL", "MP", "SA"],
  },
  {
    id: "2",
    name: "Meridian Office Park",
    location: "Dallas, TX",
    progress: 34,
    status: "at-risk" as const,
    dueDate: "Aug 2, 2026",
    team: ["BW", "TN", "RO"],
  },
  {
    id: "3",
    name: "Parkside Residences",
    location: "Denver, CO",
    progress: 91,
    status: "on-track" as const,
    dueDate: "May 1, 2026",
    team: ["CR", "JH", "PL", "AK", "MV"],
  },
  {
    id: "4",
    name: "Horizon Data Center",
    location: "Phoenix, AZ",
    progress: 12,
    status: "delayed" as const,
    dueDate: "Dec 10, 2026",
    team: ["GS", "FY"],
  },
];

const ACTIVITY_FEED = [
  {
    id: "a1",
    type: "resolved" as const,
    message: "Punch item #42 resolved",
    detail: "by John Doe on Riverfront Tower",
    time: "4 min ago",
  },
  {
    id: "a2",
    type: "added" as const,
    message: "New punch item #43 opened",
    detail: "by Karen Lee on Meridian Office Park",
    time: "27 min ago",
  },
  {
    id: "a3",
    type: "resolved" as const,
    message: "Walk report #19 submitted",
    detail: "by Mark Peters on Parkside Residences",
    time: "1 hr ago",
  },
  {
    id: "a4",
    type: "alert" as const,
    message: "Milestone deadline approaching",
    detail: "Horizon Data Center — Foundation pour in 3 days",
    time: "2 hr ago",
  },
  {
    id: "a5",
    type: "added" as const,
    message: "Sam Alvarez added to project",
    detail: "Riverfront Tower — Site Superintendent",
    time: "Yesterday",
  },
  {
    id: "a6",
    type: "resolved" as const,
    message: "Punch item #38 resolved",
    detail: "by Raj Osei on Meridian Office Park",
    time: "Yesterday",
  },
];

/* ─────────────────────── sub-components ─────────────────── */

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
];

function AvatarCluster({ initials }: { initials: string[] }) {
  const visible = initials.slice(0, 4);
  const overflow = initials.length - visible.length;
  return (
    <div className="flex items-center" aria-label={`${initials.length} team members`}>
      {visible.map((init, i) => (
        <span
          key={`${init}-${i}`}
          style={{ zIndex: visible.length - i }}
          className={cn(
            "relative -ml-2 first:ml-0 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white text-[10px] font-bold text-white select-none",
            AVATAR_COLORS[i % AVATAR_COLORS.length]
          )}
        >
          {init}
        </span>
      ))}
      {overflow > 0 && (
        <span className="relative -ml-2 flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-white bg-slate-200 text-[10px] font-bold text-slate-600 select-none">
          +{overflow}
        </span>
      )}
    </div>
  );
}

const STATUS_CONFIG = {
  "on-track": {
    label: "On Track",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    bar: "bg-emerald-500",
    icon: CheckCircle2,
  },
  "at-risk": {
    label: "At Risk",
    color: "text-amber-700",
    bg: "bg-amber-50",
    bar: "bg-amber-500",
    icon: Clock,
  },
  delayed: {
    label: "Delayed",
    color: "text-rose-700",
    bg: "bg-rose-50",
    bar: "bg-rose-500",
    icon: AlertCircle,
  },
};

/* ─────────────────────── main component ─────────────────── */

interface CommandCenterContentProps {
  userName: string;
  orgName: string;
  storageLimitGb: number;
  entitlements?: Entitlements | null;
}

export function CommandCenterContent({
  userName,
  orgName,
}: CommandCenterContentProps) {
  const firstName = userName?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">

      {/* ── Welcome Banner ── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 mb-1">
          {orgName || "Slate360"}
        </p>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl text-balance">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
          Here&apos;s what&apos;s happening across your projects today.
        </p>
      </section>

      {/* ── Quick Actions Row ── */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="sr-only">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isPrimary = action.variant === "primary";
            return (
              <Link
                key={action.id}
                href={action.href}
                className={cn(
                  "group relative flex flex-col gap-4 rounded-2xl p-5 transition-all duration-200",
                  isPrimary
                    ? [
                        "bg-blue-600 text-white ring-0",
                        "shadow-[0_0_0_3px_rgba(37,99,235,0.18),0_8px_24px_0_rgba(37,99,235,0.28)]",
                        "hover:bg-blue-700 hover:shadow-[0_0_0_4px_rgba(37,99,235,0.24),0_12px_32px_0_rgba(37,99,235,0.35)]",
                        "hover:-translate-y-0.5",
                      ].join(" ")
                    : [
                        "bg-white ring-1 ring-slate-200 shadow-sm",
                        "hover:ring-blue-300 hover:shadow-md hover:-translate-y-0.5",
                      ].join(" ")
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                    isPrimary ? "bg-white/20" : "bg-blue-50"
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5", isPrimary ? "text-white" : "text-blue-600")}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isPrimary ? "text-white" : "text-slate-900"
                    )}
                  >
                    {action.label}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs leading-relaxed",
                      isPrimary ? "text-blue-100" : "text-slate-500"
                    )}
                  >
                    {action.description}
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5",
                    isPrimary ? "text-white/70" : "text-slate-400"
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Active Projects Grid + Activity Feed (2-col on lg) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Active Projects — takes 2 cols */}
        <section className="lg:col-span-2" aria-labelledby="projects-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="projects-heading" className="text-lg font-semibold text-slate-900">
              Active Projects
            </h2>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ACTIVE_PROJECTS.map((project) => {
              const status = STATUS_CONFIG[project.status];
              const StatusIcon = status.icon;
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group flex flex-col gap-4 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5 hover:ring-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Project name + status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                        {project.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span>{project.location}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        status.bg,
                        status.color
                      )}
                    >
                      <StatusIcon className="h-3 w-3" aria-hidden="true" />
                      {status.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500">Progress</span>
                      <span className="text-xs font-semibold text-slate-900">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={project.progress} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", status.bar)}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer: due date + avatars */}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                      Due <span className="font-medium text-slate-600">{project.dueDate}</span>
                    </p>
                    <AvatarCluster initials={project.team} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent Activity Feed — takes 1 col */}
        <section aria-labelledby="activity-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="activity-heading" className="text-lg font-semibold text-slate-900">
              Recent Activity
            </h2>
            <Link
              href="/coordination"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Hub
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100" role="list">
              {ACTIVITY_FEED.map((item) => {
                const isResolved = item.type === "resolved";
                const isAlert = item.type === "alert";
                const Icon = isResolved
                  ? CheckCircle2
                  : isAlert
                    ? AlertCircle
                    : Clock;
                const iconColor = isResolved
                  ? "text-emerald-500"
                  : isAlert
                    ? "text-amber-500"
                    : "text-blue-500";
                return (
                  <li key={item.id} className="flex gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <Icon
                      className={cn("mt-0.5 h-4 w-4 shrink-0", iconColor)}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 leading-snug">
                        {item.message}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed line-clamp-1">
                        {item.detail}
                      </p>
                    </div>
                    <time className="shrink-0 text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                      {item.time}
                    </time>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
