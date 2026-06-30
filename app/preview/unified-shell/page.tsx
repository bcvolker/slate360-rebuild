"use client";

import { useState } from "react";
import {
  Search as IconSearch,
  PanelRightClose as IconCloseCtx,
  PanelRightOpen as IconOpenCtx,
  FolderKanban,
  Cloud,
  Users,
  Calendar,
  FileText,
  Footprints,
  Box,
} from "lucide-react";
import { shellTokens as t, type ShellApp } from "@/components/shell/shell-tokens";
import { cn } from "@/lib/utils";

/**
 * Browser preview of the unified Slate360 shell (docs/design/SLATE360_UNIFIED_SHELL.md).
 * Demonstrates the FIXES for the current shells: a compact grouped top bar (not crowded),
 * strong app-name branding, a center that FILLS width (no blank void), a collapsing context
 * pane, and accent-only differentiation (flip the switcher → the whole shell recolors).
 * Tokens only. View at /preview/unified-shell.
 */

const APPS: { id: ShellApp; label: string }[] = [
  { id: "dashboard", label: "Home" },
  { id: "site-walk", label: "Site Walk" },
  { id: "twin360", label: "Twin 360" },
];

const SHARED_NAV = [
  { label: "Projects", icon: FolderKanban },
  { label: "SlateDrop", icon: Cloud },
  { label: "Contacts", icon: Users },
  { label: "Calendar", icon: Calendar },
  { label: "Deliverables", icon: FileText },
];

const APP_NAV: Record<ShellApp, { label: string; icon: typeof Box }[]> = {
  dashboard: [],
  "site-walk": [{ label: "Walks", icon: Footprints }, { label: "Deliverables", icon: FileText }],
  twin360: [{ label: "Spaces", icon: Box }, { label: "Models", icon: Box }],
};

const APP_NAME: Record<ShellApp, string> = {
  dashboard: "Slate360",
  "site-walk": "Site Walk",
  twin360: "Twin 360",
};

export default function UnifiedShellPreview() {
  const [app, setApp] = useState<ShellApp>("site-walk");
  const [activeNav, setActiveNav] = useState("Projects");
  const [contextOpen, setContextOpen] = useState(true);

  return (
    <div className="min-h-screen bg-black p-4">
      {/* data-app drives --app-accent for the whole shell */}
      <div
        data-app={app}
        className={cn(t.root, "mx-auto max-w-[1200px] overflow-hidden rounded-2xl ring-1 ring-white/10")}
        style={{ height: 680 }}
      >
        {/* ── Left rail ── */}
        <aside className={cn(t.rail, "!flex")}>
          <p className={cn(t.railGroupLabel, "!mt-0")}>Workspace</p>
          {APP_NAV[app].length === 0 ? (
            <p className="px-2.5 text-[11px] text-[var(--graphite-muted)]">Pick a workspace above</p>
          ) : (
            APP_NAV[app].map((item) => (
              <NavRow key={item.label} label={item.label} Icon={item.icon} active={activeNav === item.label} onClick={() => setActiveNav(item.label)} />
            ))
          )}
          <p className={t.railGroupLabel}>Shared</p>
          {SHARED_NAV.map((item) => (
            <NavRow key={item.label} label={item.label} Icon={item.icon} active={activeNav === item.label} onClick={() => setActiveNav(item.label)} />
          ))}
          <div className="mt-auto flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold text-[var(--graphite-text-header)]">B</span>
            <span className="text-[12px] text-[var(--graphite-text-body)]">Brian</span>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar — compact, three groups, strong branding (FIX for crowded header) */}
          <header className={t.topBar}>
            {/* Brand: wordmark + accent tick (hierarchy, not clutter) */}
            <div className="flex items-center gap-2">
              <span className={t.brandTick} aria-hidden />
              <span className={t.brandWordmark}>{APP_NAME[app]}</span>
            </div>

            {/* App switcher (each pill previews its own accent) */}
            <div role="tablist" className="ml-2 inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
              {APPS.map((a) => {
                const isActive = a.id === app;
                return (
                  <button
                    key={a.id}
                    role="tab"
                    aria-selected={isActive}
                    data-app={a.id}
                    onClick={() => setApp(a.id)}
                    className={cn(
                      "rounded-[10px] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
                      isActive
                        ? "bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--graphite-text-header)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--app-accent)_28%,transparent)]"
                        : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]",
                    )}
                  >
                    <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-sm align-middle", isActive ? "bg-[var(--app-accent)]" : "bg-white/15")} aria-hidden />
                    {a.label}
                  </button>
                );
              })}
            </div>

            <div className={t.topBarSpacer} />

            <button className={cn(t.commandTrigger, "w-56")}>
              <IconSearch className="h-4 w-4" />
              <span>Search or jump…</span>
              <kbd className="ml-auto rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
            <button onClick={() => setContextOpen((v) => !v)} aria-label="Toggle context" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
              {contextOpen ? <IconCloseCtx className="h-4 w-4" /> : <IconOpenCtx className="h-4 w-4" />}
            </button>
          </header>

          {/* Center + context */}
          <div className="flex min-h-0 flex-1">
            <main className={cn(t.workspace, t.workspacePad)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={t.monoLabel}>{activeNav}</p>
                  <h1 className="mt-1 text-lg font-bold text-[var(--graphite-text-header)]">Recent {activeNav.toLowerCase()}</h1>
                </div>
                <button className={t.primaryBtn}>Upload</button>
              </div>
              {/* Fluid grid that fills width — no blank void */}
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={cn(t.glass, "p-4")}>
                    <p className={t.monoLabel}>Jun {12 + i}, 2026</p>
                    <p className="mt-1 truncate text-[14px] font-semibold text-[var(--graphite-text-header)]">{activeNav} item {i + 1}</p>
                    <p className="mt-2 text-[12px] text-[var(--graphite-muted)]">Ready · 2 items</p>
                  </div>
                ))}
              </div>
            </main>

            {contextOpen ? (
              <aside className={cn(t.contextPane, "!flex")}>
                <div className="p-4">
                  <p className={t.monoLabel}>Details</p>
                  <p className="mt-3 text-[13px] text-[var(--graphite-text-body)]">Select an item to view metadata, quick actions, and activity.</p>
                  <button className={cn(t.primaryBtn, "mt-4 w-full justify-center")}>Share</button>
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-[1200px] text-center font-mono text-[11px] uppercase tracking-wider text-white/40">
        Toggle the switcher → accent recolors the whole shell. Toggle the right icon → context collapses, center fills.
      </p>
    </div>
  );
}

function NavRow({ label, Icon, active, onClick }: { label: string; Icon: typeof Box; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(t.navItem, active && t.navItemActive)}>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="font-mono text-[11px] uppercase tracking-[0.1em]">{label}</span>
    </button>
  );
}
