"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { shellTokens } from "@/components/shell/shell-tokens";
import type { ShellApp } from "@/components/shell/shell-tokens";
import { CreateSheet } from "@/components/product-shell/CreateSheet";

type DashboardDesktopTopBarProps = {
  userName: string;
  shellApp: ShellApp;
  twinVisible: boolean;
  siteWalkVisible?: boolean;
  spatialWalkthroughVisible?: boolean;
  spatialOnly?: boolean;
  onOpenCommand: () => void;
};

/**
 * Unified-shell desktop top bar (Phase 3b). Three groups so it never reads as crowded:
 * brand wordmark + accent tick (tick picks up --app-accent per active app) · AppSwitcher
 * (single-gated — twinVisible derived from resolveDashboardNav) · ⌘K + account. Desktop
 * counterpart to the mobile branding fix. See docs/design/SLATE360_UNIFIED_SHELL.md.
 */
export function DashboardDesktopTopBar({
  userName,
  shellApp,
  twinVisible,
  siteWalkVisible = true,
  spatialWalkthroughVisible = false,
  spatialOnly = false,
  onOpenCommand,
}: DashboardDesktopTopBarProps) {
  const initial = (userName.trim()[0] ?? "U").toUpperCase();
  const [create, setCreate] = useState(false);
  void shellApp;
  void twinVisible;
  void siteWalkVisible;
  void spatialWalkthroughVisible;
  void spatialOnly;

  return (
    <header className="hidden h-12 shrink-0 items-center gap-3 border-b border-[var(--mkt-line)] px-4 lg:flex">
      <p className="truncate text-sm text-[var(--mkt-ink-muted)]">Workspace</p>

      <div className={shellTokens.topBarSpacer} />

      <button
        type="button"
        onClick={() => setCreate(true)}
        className="inline-flex h-10 items-center rounded-lg bg-[var(--mkt-accent)] px-3 text-sm font-semibold text-white"
      >
        + Create
      </button>

      <button
        type="button"
        onClick={onOpenCommand}
        className="hidden h-9 items-center gap-2 rounded-lg border border-[var(--mkt-line)] bg-[var(--mkt-surface)] px-3 text-[13px] text-[var(--mkt-ink-muted)] transition-colors hover:border-[var(--mkt-accent-line)] hover:text-[var(--mkt-ink)] md:flex"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span>Search or jump…</span>
        <kbd className="ml-2 rounded border border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="flex shrink-0 items-center gap-2.5">
        <span className="hidden text-sm text-[var(--mkt-ink-muted)] lg:inline">{userName}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] text-xs font-bold text-[var(--app-accent)]"
          aria-hidden
        >
          {initial}
        </span>
      </div>
      <CreateSheet open={create} onClose={() => setCreate(false)} />
    </header>
  );
}
