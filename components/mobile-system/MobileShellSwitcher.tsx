"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppWindow, Camera, Check, LayoutGrid, LucideIcon, SquareStack } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";
import { resolveMobileRoute, type MobileShellRoute } from "./mainMobileTabs";

type ShellEntry = {
  route: MobileShellRoute;
  name: string;
  href: string;
  icon: LucideIcon;
  accent: string;
};

const SHELLS: ShellEntry[] = [
  { route: "app", name: "Slate360", href: "/app", icon: SquareStack, accent: "text-white" },
  { route: "site-walk", name: "Site Walk", href: "/site-walk", icon: Camera, accent: "text-emerald-300" },
  { route: "digital-twin", name: "Twin 360", href: "/digital-twin", icon: AppWindow, accent: "text-sky-300" },
];

/**
 * Header "switch app" control — a single, always-present way to jump between
 * the Slate360, Site Walk, and Twin 360 shells from any screen. Replaces the
 * old behaviour where you could only reach a shell from the /app launcher.
 */
export function MobileShellSwitcher() {
  const pathname = usePathname() ?? "";
  const current = resolveMobileRoute(pathname);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(mobileTokens.mobileHeaderIconButton, mobileTokens.focusRing)}
        aria-label="Switch app"
        aria-expanded={open}
      >
        <LayoutGrid className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
      </button>

      {open ? (
        <>
          {/* click-away backdrop */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className={cn(mobileTokens.mobileHeaderPopover, "p-2")}>
            <p className={cn(mobileTokens.mobileHeaderPopoverLabel, "px-2 pb-1")}>Switch app</p>
            <ul className="space-y-0.5">
              {SHELLS.map((shell) => {
                const Icon = shell.icon;
                const active = shell.route === current;
                return (
                  <li key={shell.route}>
                    <Link
                      href={shell.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                        active ? "bg-white/[0.08] text-white" : "text-zinc-200 hover:bg-white/[0.05]",
                      )}
                    >
                      <Icon className={cn("size-5 shrink-0", shell.accent)} strokeWidth={2} />
                      <span className="flex-1">{shell.name}</span>
                      {active ? <Check className="size-4 shrink-0 text-emerald-400" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
