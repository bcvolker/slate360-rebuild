/**
 * Public preview of the new authenticated App Shell — PR #26.
 *
 * Uses the REAL production components (MobileTopBar + MobileBottomNav + the
 * desktop DashboardSidebar/DashboardTopBar via AppShell) wrapped around mock
 * Command Center content. No login required — open this on your phone to
 * preview what the live shell will look like once PR #26 merges.
 *
 * Route: /preview/app-shell-v1
 */

import { AppShell } from "@/components/dashboard/AppShell";
import { MapPin, Camera, Palette, BookOpen, Plus, Cloud, ArrowRight, MessageSquare, Star } from "lucide-react";

export const metadata = {
  title: "App Shell Preview — Slate360",
};

const apps = [
  { label: "Site Walk", icon: MapPin, status: "live", href: "/site-walk" },
  { label: "360 Tours", icon: Camera, status: "coming", href: "#" },
  { label: "Design Studio", icon: Palette, status: "coming", href: "#" },
  { label: "Content Studio", icon: BookOpen, status: "coming", href: "#" },
];

const quickActions = [
  { label: "New Project", icon: Plus },
  { label: "Open SlateDrop", icon: Cloud },
  { label: "Continue Work", icon: ArrowRight },
];

const messages = [
  { from: "Sarah Chen", text: "RFI #142 needs your sign-off", time: "2m" },
  { from: "Mike Torres", text: "Site walk complete — 18 items captured", time: "1h" },
  { from: "Project Atlas", text: "3 photos pending review", time: "3h" },
];

const projects = [
  { name: "Atlas Tower — Phase 2", status: "Active", pinned: true, progress: 64 },
  { name: "Riverside Mixed-Use", status: "Active", pinned: true, progress: 38 },
  { name: "Cedar Park Residences", status: "Pre-construction", pinned: false, progress: 12 },
];

export default function AppShellPreviewPage() {
  return (
    <AppShell
      userName="Preview User"
      hasOperationsConsoleAccess={false}
      isBetaEligible={true}
      inviteShareData={{
        userId: "preview-user",
        userName: "Preview User",
        beta: { seatsClaimed: 47, cap: 200 },
        projects: [
          { id: "p1", name: "Atlas Tower — Phase 2" },
          { id: "p2", name: "Riverside Mixed-Use" },
        ],
        contacts: [],
      }}
    >
      <div className="px-4 py-5 lg:px-8 lg:py-8 space-y-6 max-w-5xl mx-auto">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Good morning, Preview</h1>
          <p className="text-sm text-slate-400 mt-1">Here's what's happening today.</p>
        </div>

        {/* Apps Grid */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Apps</h2>
          <div className="grid grid-cols-2 gap-3">
            {apps.map((app) => {
              const Icon = app.icon;
              const isLive = app.status === "live";
              return (
                <div
                  key={app.label}
                  className={`relative rounded-2xl border p-4 transition-colors ${
                    isLive
                      ? "bg-[#151A23] border-cobalt/30 hover:border-cobalt/60"
                      : "bg-[#151A23]/60 border-white/5"
                  }`}
                >
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${
                      isLive ? "bg-cobalt/15 text-cobalt" : "bg-white/5 text-slate-500"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">{app.label}</div>
                  <div className={`text-[11px] mt-0.5 ${isLive ? "text-cobalt" : "text-slate-500"}`}>
                    {isLive ? "Live" : "Coming soon"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Quick Access</h2>
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.label}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl bg-[#151A23] border border-white/5 px-2 py-3 hover:border-cobalt/40 transition-colors"
                >
                  <Icon className="h-4 w-4 text-cobalt" />
                  <span className="text-[11px] font-medium text-slate-300 text-center leading-tight">{qa.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Coordination Hub */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Coordination Hub</h2>
            <span className="text-[11px] text-cobalt">View all</span>
          </div>
          <div className="rounded-2xl bg-[#151A23] border border-white/5 divide-y divide-white/5">
            {messages.map((m) => (
              <div key={m.from} className="flex items-start gap-3 p-3">
                <div className="h-8 w-8 rounded-full bg-cobalt/15 text-cobalt flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                  {m.from.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{m.from}</span>
                    <span className="text-[11px] text-slate-500 flex-shrink-0">{m.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{m.text}</p>
                </div>
                <MessageSquare className="h-4 w-4 text-slate-600 flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Projects</h2>
            <div className="flex gap-1 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-cobalt/15 text-cobalt font-medium">Pinned</span>
              <span className="px-2 py-0.5 rounded-full text-slate-500">All</span>
            </div>
          </div>
          <div className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.name}
                className="rounded-xl bg-[#151A23] border border-white/5 p-3 flex items-center gap-3"
              >
                {p.pinned && <Star className="h-3.5 w-3.5 text-cobalt fill-cobalt flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{p.status}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-semibold text-cobalt">{p.progress}%</div>
                  <div className="w-16 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-cobalt" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center pt-4 pb-2">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">App Shell Preview · PR #26</p>
        </div>
      </div>
    </AppShell>
  );
}
