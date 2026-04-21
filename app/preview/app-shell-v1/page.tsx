/**
 * Public preview of the new authenticated App Shell — PR #26.
 *
 * Mounts real AppShell + MobileTopBar + MobileBottomNav around mock Command
 * Center content. No auth required. Open on phone to preview new cobalt
 * mobile chrome before merge.
 *
 * Route: /preview/app-shell-v1
 */

import { AppShell } from "@/components/dashboard/AppShell";
import { MapPin, Camera, Palette, BookOpen, Plus, Cloud, Zap, FileText, MessageSquare, Star, ArrowRight } from "lucide-react";
import { OnboardingTeaser } from "./OnboardingTeaser";

export const metadata = {
  title: "App Shell Preview — Slate360",
};

const apps = [
  { label: "Site Walk", icon: MapPin, status: "live" },
  { label: "360 Tours", icon: Camera, status: "coming" },
  { label: "Design Studio", icon: Palette, status: "coming" },
  { label: "Content Studio", icon: BookOpen, status: "coming" },
];

// 4 generic tiles to match Apps grid — none app-specific.
// Quick Start = adaptive launcher (opens picker for whichever app(s) the user is subscribed to).
const quickActions = [
  { label: "Quick Start", icon: Zap },
  { label: "New Project", icon: Plus },
  { label: "SlateDrop", icon: Cloud },
  { label: "Recent Files", icon: FileText },
];

const messages = [
  { from: "Sarah Chen", text: "RFI #142 needs your sign-off", time: "2m", unread: true },
  { from: "Mike Torres", text: "Site walk complete — 18 items captured", time: "1h", unread: true },
  { from: "Project Atlas", text: "3 photos pending review", time: "3h", unread: false },
  { from: "Lena Park", text: "Punch list updated for floor 4", time: "5h", unread: false },
  { from: "James Wu", text: "New deliverable shared with you", time: "1d", unread: false },
  { from: "Notifications", text: "Weekly summary is ready", time: "2d", unread: false },
];

const projects = [
  { name: "Atlas Tower — Phase 2", status: "Active", pinned: true, progress: 64 },
  { name: "Riverside Mixed-Use", status: "Active", pinned: true, progress: 38 },
  { name: "Cedar Park Residences", status: "Pre-construction", pinned: false, progress: 12 },
  { name: "Northgate Medical", status: "Active", pinned: false, progress: 51 },
  { name: "Harbor View Lofts", status: "Active", pinned: false, progress: 27 },
  { name: "Westbrook Industrial", status: "On hold", pinned: false, progress: 8 },
  { name: "Sunrise Plaza Retail", status: "Active", pinned: false, progress: 73 },
];

export default function AppShellPreviewPage() {
  const isOddApps = apps.length % 2 === 1;
  const isOddQA = quickActions.length % 2 === 1;

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
      <OnboardingTeaser />
      <div className="px-4 py-5 lg:px-8 lg:py-8 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Good morning, Preview</h1>
          <p className="text-sm text-slate-400 mt-1">Here&apos;s what&apos;s happening today.</p>
        </div>

        {/* Apps Grid — 2 cols, last-odd centers */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Apps</h2>
          <div className="grid grid-cols-2 gap-3">
            {apps.map((app, i) => {
              const Icon = app.icon;
              const isLive = app.status === "live";
              const lastOdd = isOddApps && i === apps.length - 1;
              return (
                <div
                  key={app.label}
                  className={`relative rounded-2xl border p-4 transition-colors ${
                    isLive
                      ? "bg-[#151A23] border-cobalt/30 hover:border-cobalt/60"
                      : "bg-[#151A23]/60 border-white/5"
                  } ${lastOdd ? "col-span-2 max-w-[calc(50%-0.375rem)] mx-auto w-full" : ""}`}
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

        {/* Quick Access — matches Apps grid */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((qa, i) => {
              const Icon = qa.icon;
              const lastOdd = isOddQA && i === quickActions.length - 1;
              return (
                <button
                  key={qa.label}
                  className={`flex items-center gap-3 rounded-2xl bg-[#151A23] border border-white/5 px-4 py-3 hover:border-cobalt/40 transition-colors text-left ${
                    lastOdd ? "col-span-2 max-w-[calc(50%-0.375rem)] mx-auto w-full" : ""
                  }`}
                >
                  <span className="h-9 w-9 rounded-xl bg-cobalt/15 text-cobalt flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-200 truncate">{qa.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Coordination Hub — preview only (3 most recent), full hub on its own page */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Coordination Hub</h2>
            <a href="#coordination" className="text-[11px] text-cobalt font-semibold inline-flex items-center gap-1">
              Open Hub
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="rounded-2xl bg-[#151A23] border border-white/5 divide-y divide-white/5 overflow-hidden">
            {messages.slice(0, 3).map((m) => (
              <div key={m.from + m.time} className="flex items-start gap-3 p-3">
                <div className="h-8 w-8 rounded-full bg-cobalt/15 text-cobalt flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                  {m.from.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                      {m.from}
                      {m.unread && <span className="h-1.5 w-1.5 rounded-full bg-cobalt flex-shrink-0" />}
                    </span>
                    <span className="text-[11px] text-slate-500 flex-shrink-0">{m.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{m.text}</p>
                </div>
                <MessageSquare className="h-4 w-4 text-slate-600 flex-shrink-0 mt-1" />
              </div>
            ))}
            {messages.length > 3 && (
              <a
                href="#coordination"
                className="flex items-center justify-between p-3 text-xs text-cobalt hover:bg-cobalt/5 transition-colors"
              >
                <span>+{messages.length - 3} more in Coordination Hub</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </section>

        {/* Projects — pinned shown inline, full list opens its own page */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Projects</h2>
            <a href="/projects" className="text-[11px] text-cobalt font-semibold inline-flex items-center gap-1">
              All projects
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="space-y-2">
            {projects.filter((p) => p.pinned).map((p) => (
              <div key={p.name} className="rounded-xl bg-[#151A23] border border-white/5 p-3 flex items-center gap-3">
                <Star className="h-3.5 w-3.5 text-cobalt fill-cobalt flex-shrink-0" />
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
            <a
              href="/projects"
              className="flex items-center justify-between rounded-xl bg-[#151A23]/60 border border-dashed border-white/10 p-3 text-xs text-cobalt hover:border-cobalt/40 transition-colors"
            >
              <span>View all {projects.length} projects</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        <div className="text-center pt-4 pb-2">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">App Shell Preview · PR #26</p>
        </div>
      </div>
    </AppShell>
  );
}
