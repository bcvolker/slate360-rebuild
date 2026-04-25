"use client";

import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  Search,
  Bell,
  Settings,
  Zap,
  Plus,
  UserPlus,
  FileBarChart,
  MapPin,
  ArrowUpRight,
  CheckCircle2,
  MessageSquare,
  FileText,
  Camera,
  ChevronRight,
} from "lucide-react";

/**
 * Slate360 — Command Center
 * Single-file authenticated app shell mockup.
 *
 * Aesthetic:
 *  - Canvas: bg-slate-50 (never pure white)
 *  - Cards: bg-white + ring-1 ring-slate-200 + shadow-sm
 *  - Sidebar: bg-slate-900 / text-slate-300, white logo, w-64
 *  - Primary action: bg-blue-600 (Cobalt)
 */
export default function CommandCenterMockup() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      {/* ───────── LEFT SIDEBAR ───────── */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-300 md:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-white/5 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            Slate<span className="text-blue-400">360</span>
          </span>
        </div>

        {/* Workspace switcher */}
        <div className="px-4 pt-5">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
                BC
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium text-white">Brian&apos;s Construction</div>
                <div className="text-[11px] text-slate-400">Enterprise plan</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="mt-6 flex-1 space-y-1 px-3">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>

          <NavItem icon={LayoutDashboard} label="Dashboard" active />
          <NavItem icon={FolderKanban} label="Projects" badge="12" />
          <NavItem icon={Users} label="Directory" />
          <NavItem icon={BarChart3} label="Reports" />

          <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Tools
          </p>
          <NavItem icon={Camera} label="Site Walks" />
          <NavItem icon={FileText} label="Documents" />
          <NavItem icon={MessageSquare} label="Inbox" badge="3" />
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 p-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </aside>

      {/* ───────── MAIN AREA ───────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          {/* Search */}
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects, people, files…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-16 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
            <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline-block">
              ⌘K
            </kbd>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>

            <div className="mx-1 h-6 w-px bg-slate-200" />

            <button
              type="button"
              className="flex items-center gap-2 rounded-lg p-1 pr-3 transition hover:bg-slate-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-xs font-semibold text-white">
                BR
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-sm font-medium text-slate-900">Brian Reyes</div>
                <div className="text-[11px] text-slate-500">Project Director</div>
              </div>
            </button>
          </div>
        </header>

        {/* Scrolling content body */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
          {/* Welcome banner */}
          <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Tuesday, April 28</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 text-balance">
                Welcome back, Brian
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 text-pretty">
                You have <span className="font-medium text-slate-900">3 punch items</span> awaiting
                review and <span className="font-medium text-slate-900">2 walks</span> scheduled
                today.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <StatChip label="Active projects" value="12" trend="+2" />
              <StatChip label="Open RFIs" value="7" trend="-1" trendDown />
            </div>
          </section>

          {/* Quick actions */}
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Quick Actions
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Cobalt glowing primary card */}
              <button
                type="button"
                className="group relative flex flex-col items-start gap-4 overflow-hidden rounded-xl bg-blue-600 p-5 text-left text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-500 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40"
              >
                {/* glow */}
                <div
                  aria-hidden="true"
                  className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-400/30 blur-3xl"
                />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="relative">
                  <div className="text-base font-semibold">Start Ad-Hoc Walk</div>
                  <p className="mt-1 text-sm text-blue-100">
                    Capture observations on-site in seconds.
                  </p>
                </div>
                <div className="relative mt-2 inline-flex items-center gap-1 text-sm font-medium">
                  Begin walk
                  <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </button>

              <QuickActionCard
                icon={Plus}
                title="New Project"
                description="Spin up a project workspace."
              />
              <QuickActionCard
                icon={UserPlus}
                title="Add Stakeholder"
                description="Invite a teammate or owner."
              />
              <QuickActionCard
                icon={FileBarChart}
                title="Generate Report"
                description="Weekly progress, ready to send."
              />
            </div>
          </section>

          {/* Two column layout */}
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            {/* Active projects (2/3) */}
            <section className="xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Active Projects
                </h2>
                <a
                  href="#"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View all
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ProjectCard
                  name="Harborview Tower"
                  location="Seattle, WA"
                  progress={72}
                  status="On track"
                  team={["JD", "MK", "AL", "RR"]}
                  budget="$12.4M"
                />
                <ProjectCard
                  name="Cedar Grove Residences"
                  location="Portland, OR"
                  progress={48}
                  status="On track"
                  team={["EK", "TS", "JD"]}
                  budget="$6.8M"
                />
                <ProjectCard
                  name="Westbrook Logistics Hub"
                  location="Tacoma, WA"
                  progress={91}
                  status="Punching out"
                  team={["MK", "RR", "PH", "LS", "BR"]}
                  budget="$22.1M"
                />
                <ProjectCard
                  name="Riverside Medical Pavilion"
                  location="Eugene, OR"
                  progress={28}
                  status="Permitting"
                  team={["AL", "JD"]}
                  budget="$18.6M"
                  warning
                />
              </div>
            </section>

            {/* Recent activity (1/3) */}
            <section className="xl:col-span-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Recent Activity
                </h2>
                <a
                  href="#"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View feed
                </a>
              </div>

              <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
                <ul className="divide-y divide-slate-100">
                  <ActivityItem
                    icon={CheckCircle2}
                    iconClass="bg-emerald-50 text-emerald-600 ring-emerald-100"
                    title={
                      <>
                        Punch item <span className="font-mono">#42</span> resolved by{" "}
                        <span className="font-medium text-slate-900">John Doe</span>
                      </>
                    }
                    meta="Harborview Tower · 4m ago"
                  />
                  <ActivityItem
                    icon={MessageSquare}
                    iconClass="bg-blue-50 text-blue-600 ring-blue-100"
                    title={
                      <>
                        New RFI from{" "}
                        <span className="font-medium text-slate-900">Maya Khan</span>
                      </>
                    }
                    meta="Cedar Grove · 22m ago"
                  />
                  <ActivityItem
                    icon={Camera}
                    iconClass="bg-amber-50 text-amber-600 ring-amber-100"
                    title={
                      <>
                        14 photos uploaded to{" "}
                        <span className="font-medium text-slate-900">Site Walk #118</span>
                      </>
                    }
                    meta="Westbrook Hub · 1h ago"
                  />
                  <ActivityItem
                    icon={FileText}
                    iconClass="bg-slate-100 text-slate-600 ring-slate-200"
                    title={
                      <>
                        Submittal{" "}
                        <span className="font-medium text-slate-900">SUB-0214</span> approved
                      </>
                    }
                    meta="Riverside Medical · 2h ago"
                  />
                  <ActivityItem
                    icon={Users}
                    iconClass="bg-blue-50 text-blue-600 ring-blue-100"
                    title={
                      <>
                        <span className="font-medium text-slate-900">Anna Lopez</span> joined the
                        directory
                      </>
                    }
                    meta="Directory · 3h ago"
                  />
                </ul>
              </div>
            </section>
          </div>

          <div className="h-8" />
        </main>
      </div>
    </div>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      className={[
        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {badge ? (
        <span
          className={[
            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
            active ? "bg-blue-600 text-white" : "bg-white/10 text-slate-300",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function StatChip({
  label,
  value,
  trend,
  trendDown,
}: {
  label: string;
  value: string;
  trend: string;
  trendDown?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums text-slate-900">{value}</span>
        <span
          className={[
            "text-xs font-medium",
            trendDown ? "text-emerald-600" : "text-blue-600",
          ].join(" ")}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className="group flex flex-col items-start gap-4 rounded-xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200 transition group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:ring-blue-100">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
      <div className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition group-hover:text-blue-600">
        Open
        <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </button>
  );
}

function ProjectCard({
  name,
  location,
  progress,
  status,
  team,
  budget,
  warning,
}: {
  name: string;
  location: string;
  progress: number;
  status: string;
  team: string[];
  budget: string;
  warning?: boolean;
}) {
  return (
    <article className="group flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{name}</h3>
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </div>
        </div>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
            warning
              ? "bg-amber-50 text-amber-700 ring-amber-100"
              : "bg-emerald-50 text-emerald-700 ring-emerald-100",
          ].join(" ")}
        >
          {status}
        </span>
      </header>

      {/* Progress */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-500">Progress</span>
          <span className="tabular-nums font-semibold text-slate-900">{progress}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-5 flex items-center justify-between">
        <div className="flex -space-x-2">
          {team.slice(0, 4).map((initials, i) => (
            <div
              key={initials + i}
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white",
                avatarColors[i % avatarColors.length],
              ].join(" ")}
            >
              {initials}
            </div>
          ))}
          {team.length > 4 ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700 ring-2 ring-white">
              +{team.length - 4}
            </div>
          ) : null}
        </div>
        <div className="text-xs">
          <span className="text-slate-500">Budget </span>
          <span className="font-semibold text-slate-900">{budget}</span>
        </div>
      </footer>
    </article>
  );
}

const avatarColors = [
  "bg-slate-700",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-slate-500",
];

function ActivityItem({
  icon: Icon,
  iconClass,
  title,
  meta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: React.ReactNode;
  meta: string;
}) {
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <div
        className={[
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
          iconClass,
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-slate-700">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{meta}</p>
      </div>
    </li>
  );
}
