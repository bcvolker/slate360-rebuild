/**
 * Light-theme preview — apply the proposed palette to a scoped subtree by
 * setting CSS vars on a wrapper. Mirrors the "split-chrome" recommendation:
 *   - Chrome (sidebar/topbar): Graphite / zinc-950 (no navy)
 *   - Canvas (background/cards): Off-white + pure white cards with soft shadow
 *   - Cobalt buttons with cobalt drop-shadow
 *
 * This route exists ONLY so we can decide whether to apply globally.
 * Nothing here ships to production users.
 */

import Link from "next/link";
import { ArrowLeft, FolderOpen, Camera, Layers, Activity, ChevronRight, Plus, Search, Bell, User, Home, Briefcase, Compass, Settings } from "lucide-react";

export const metadata = { title: "Light theme preview — Slate360" };

const lightVars: React.CSSProperties = {
  // Canvas — darker so white cards have something to pop against
  ["--background" as string]: "#E5EAF1",
  ["--foreground" as string]: "#0F172A",
  ["--card" as string]: "#FFFFFF",
  ["--card-foreground" as string]: "#0F172A",
  ["--popover" as string]: "#FFFFFF",
  ["--popover-foreground" as string]: "#0F172A",
  // Brand
  ["--primary" as string]: "#2563EB",
  ["--primary-foreground" as string]: "#FFFFFF",
  ["--primary-hover" as string]: "#1D4ED8",
  ["--secondary" as string]: "#E2E8F0",
  ["--secondary-foreground" as string]: "#1E293B",
  ["--muted" as string]: "#E2E8F0",
  ["--muted-foreground" as string]: "#475569",
  ["--accent" as string]: "#DBE3EE",
  ["--accent-foreground" as string]: "#0F172A",
  // Borders — stronger
  ["--border" as string]: "#CBD5E1",
  ["--input" as string]: "#CBD5E1",
  ["--ring" as string]: "rgba(37, 99, 235, 0.55)",
  // Chrome — header is dark graphite, bottom nav is even darker (near-black)
  ["--sidebar" as string]: "#18181B",
  ["--sidebar-foreground" as string]: "#FAFAFA",
  ["--sidebar-primary" as string]: "#3B82F6",
  ["--sidebar-primary-foreground" as string]: "#FFFFFF",
  ["--sidebar-accent" as string]: "#27272A",
  ["--sidebar-accent-foreground" as string]: "#FAFAFA",
  ["--sidebar-border" as string]: "#27272A",
  // Bottom nav — deliberately darker than header for layered depth
  ["--bottomnav" as string]: "#09090B",
  ["--bottomnav-border" as string]: "#1F1F23",
  // Surface helpers used by various components
  ["--surface-page" as string]: "#E5EAF1",
  ["--surface-card" as string]: "#FFFFFF",
  ["--surface-card-hover" as string]: "#F8FAFC",
  ["--text-primary" as string]: "#0F172A",
  ["--text-secondary" as string]: "#475569",
  ["--text-muted" as string]: "#64748B",
  ["--surface-glass" as string]: "rgba(255, 255, 255, 0.9)",
  ["--surface-light" as string]: "#FFFFFF",
  ["--surface-light-secondary" as string]: "#F1F5F9",
  ["--border-glass" as string]: "#CBD5E1",
  ["--app-page" as string]: "#E5EAF1",
  ["--app-card" as string]: "#FFFFFF",
  ["--app-card-hover" as string]: "#F8FAFC",
  ["--app-border" as string]: "#CBD5E1",
};

const apps = [
  { name: "Project Hub", icon: FolderOpen, color: "#3B82F6", desc: "All your projects, RFIs, submittals, drawings" },
  { name: "Site Walk", icon: Camera, color: "#059669", desc: "Capture photos, voice notes, deliverables" },
  { name: "Design Studio", icon: Layers, color: "#7C3AED", desc: "3D models, BIM viewer, markup tools" },
  { name: "Market Robot", icon: Activity, color: "#EC4899", desc: "Live trading and market intelligence" },
];

export default function LightThemePreview() {
  return (
    <div style={lightVars} className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex">
      {/* SIDEBAR — graphite */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-r border-[var(--sidebar-border)] min-h-screen">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-[var(--sidebar-border)]">
          <div className="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center font-bold text-white">S</div>
          <span className="font-bold text-lg">Slate360</span>
        </div>
        <nav className="flex-1 p-3 space-y-1 text-sm">
          <SidebarItem label="Dashboard" active />
          <SidebarItem label="Projects" />
          <SidebarItem label="Site Walk" />
          <SidebarItem label="Design Studio" />
          <SidebarItem label="Content Studio" />
          <SidebarItem label="360 Tours" />
          <SidebarItem label="Market" />
          <SidebarItem label="SlateDrop" />
        </nav>
        <div className="p-3 border-t border-[var(--sidebar-border)]">
          <SidebarItem label="Settings" />
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR — graphite */}
        <header className="h-16 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] border-b border-[var(--sidebar-border)] flex items-center px-6 gap-4 sticky top-0 z-10">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-sm text-zinc-400 w-72">
            <Search className="h-4 w-4" />
            Search projects, files, tools…
          </div>
          <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-300">
            <Bell className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-semibold">
            <User className="h-5 w-5" />
          </div>
        </header>

        {/* CANVAS — off-white */}
        <main className="flex-1 p-6 lg:p-10 max-w-6xl w-full mx-auto space-y-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Welcome back, Brock</h1>
              <p className="text-[var(--muted-foreground)] mt-1">Here&rsquo;s what&rsquo;s waiting for you today.</p>
            </div>
            <button className="hidden sm:inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[var(--primary)] text-white font-semibold shadow-lg shadow-blue-500/30 hover:bg-[var(--primary-hover)] transition-all">
              <Plus className="h-4 w-4" /> New Project
            </button>
          </div>

          {/* KPI strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Active projects" value="12" />
            <Kpi label="Open RFIs" value="3" />
            <Kpi label="Site walks this week" value="7" />
            <Kpi label="Pending deliverables" value="2" />
          </section>

          {/* App cards */}
          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-semibold">Your apps</h2>
              <button className="text-sm text-[var(--primary)] font-medium hover:underline">Customize</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {apps.map((a) => (
                <AppCard key={a.name} name={a.name} icon={a.icon} color={a.color} desc={a.desc} />
              ))}
            </div>
          </section>

          {/* Activity feed */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-md ring-1 ring-slate-900/5 divide-y divide-[var(--border)]">
              {[
                { who: "Sara Lopez", what: "uploaded 12 photos to", where: "1247 Mountain Trail Rd" },
                { who: "Mike Tanaka", what: "approved RFI #008 on", where: "Building Permits" },
                { who: "You", what: "shared a deliverable with", where: "Carolyn Reeves" },
              ].map((ev, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 hover:bg-[var(--accent)] transition-colors">
                  <div className="h-9 w-9 rounded-full bg-blue-100 text-[var(--primary)] flex items-center justify-center text-sm font-semibold">
                    {ev.who.split(" ").map((p) => p[0]).join("")}
                  </div>
                  <div className="flex-1 text-sm">
                    <span className="font-semibold text-[var(--foreground)]">{ev.who}</span>{" "}
                    <span className="text-[var(--muted-foreground)]">{ev.what}</span>{" "}
                    <span className="font-medium text-[var(--foreground)]">{ev.where}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                </div>
              ))}
            </div>
          </section>

          {/* CTA palette */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Buttons & links — depth check</h2>
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-md ring-1 ring-slate-900/5 p-6 flex flex-wrap gap-3">
              <button className="h-11 px-5 rounded-xl bg-[var(--primary)] text-white font-semibold shadow-lg shadow-blue-500/40 hover:bg-[var(--primary-hover)] transition-all">
                Primary action
              </button>
              <button className="h-11 px-5 rounded-xl bg-white border border-[var(--border)] text-[var(--foreground)] font-semibold hover:bg-[var(--accent)] hover:border-[var(--primary)] transition-all">
                Secondary
              </button>
              <button className="h-11 px-5 rounded-xl text-[var(--primary)] font-semibold hover:bg-blue-50 transition-all">
                Tertiary link
              </button>
              <a href="#" className="h-11 px-5 inline-flex items-center text-[var(--primary)] font-medium hover:underline">
                Plain link →
              </a>
            </div>
          </section>

          <div className="pt-4 text-xs text-[var(--muted-foreground)]">
            Preview only. Nothing here ships until you approve. Compare side-by-side with the live dashboard at <Link href="/dashboard" className="text-[var(--primary)] underline">/dashboard</Link>.
          </div>
          {/* Spacer so content doesn't sit under the bottom nav on mobile */}
          <div className="h-20 md:hidden" />
        </main>
      </div>

      {/* MOBILE BOTTOM NAV — darker than the header */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 h-[68px] bg-[var(--bottomnav)] border-t border-[var(--bottomnav-border)] text-zinc-400">
        <ul className="grid grid-cols-5 h-full">
          {[
            { icon: Home, label: "Home", active: true },
            { icon: Briefcase, label: "Projects" },
            { icon: Camera, label: "Capture" },
            { icon: Compass, label: "Tours" },
            { icon: Settings, label: "More" },
          ].map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={i} className="flex items-center justify-center">
                <button className={`flex flex-col items-center gap-0.5 ${it.active ? "text-[var(--primary)]" : "text-zinc-500 hover:text-zinc-200"}`}>
                  <Icon className="h-5 w-5" strokeWidth={it.active ? 2.5 : 2} />
                  <span className={`text-[10px] ${it.active ? "font-semibold" : "font-medium"}`}>{it.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function SidebarItem({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
        active
          ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] font-semibold"
          : "text-zinc-400 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-md ring-1 ring-slate-900/5 p-5">
      <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] font-semibold">{label}</div>
      <div className="mt-1 text-3xl font-bold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function AppCard({
  name,
  icon: Icon,
  color,
  desc,
}: {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  desc: string;
}) {
  return (
    <button className="text-left bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-md ring-1 ring-slate-900/5 hover:shadow-xl hover:ring-2 hover:ring-[var(--primary)]/40 hover:border-[var(--primary)] hover:-translate-y-0.5 transition-all p-5 group">
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">{name}</div>
      <div className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">{desc}</div>
    </button>
  );
}
