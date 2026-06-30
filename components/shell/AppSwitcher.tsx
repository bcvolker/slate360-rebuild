"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ShellApp } from "./shell-tokens";

type SwitcherItem = { id: ShellApp; label: string; href: string };

const ITEMS: SwitcherItem[] = [
  { id: "dashboard", label: "Home", href: "/dashboard" },
  { id: "site-walk", label: "Site Walk", href: "/site-walks" },
  { id: "twin360", label: "Twin 360", href: "/digital-twins" },
];

/**
 * Unified app switcher — the single control that moves between the three surfaces.
 * Accent-only differentiation: each item carries its own `data-app`, so the ACTIVE pill
 * renders in that surface's accent (green Site Walk / blue Twin 360) — a live preview of
 * the accent the whole shell takes on switch. Compact + grouped so the top bar never
 * reads as crowded. `twinVisible` is driven by resolveDashboardNav (Twin hidden in store mode).
 */
export function AppSwitcher({
  active,
  twinVisible = true,
}: {
  active: ShellApp;
  twinVisible?: boolean;
}) {
  const items = twinVisible ? ITEMS : ITEMS.filter((i) => i.id !== "twin360");

  return (
    <div
      role="tablist"
      aria-label="Workspace"
      className="inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-0.5"
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            role="tab"
            aria-selected={isActive}
            data-app={item.id}
            className={cn(
              "rounded-[10px] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
              isActive
                ? "bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--graphite-text-header)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--app-accent)_28%,transparent)]"
                : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]",
            )}
          >
            <span
              className={cn(
                "mr-1.5 inline-block h-1.5 w-1.5 rounded-sm align-middle",
                isActive ? "bg-[var(--app-accent)]" : "bg-white/15",
              )}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
