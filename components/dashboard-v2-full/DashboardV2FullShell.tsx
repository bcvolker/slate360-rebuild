"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import type { InviteShareData } from "@/lib/types/invite";
import { DashboardV2Sidebar } from "./DashboardV2Sidebar";
import { DashboardV2TopBar } from "./DashboardV2TopBar";
import { DashboardV2MobileHeader } from "./DashboardV2MobileHeader";
import { DashboardV2MobileNav } from "./DashboardV2MobileNav";

const CommandPalette = dynamic(
  () => import("@/components/shared/CommandPalette"),
  { ssr: false },
);

const InviteShareModal = dynamic(
  () =>
    import("@/components/shared/InviteShareModal").then(
      (m) => m.InviteShareModal,
    ),
  { ssr: false },
);

export interface DashboardV2FullShellProps {
  userName: string;
  userInitial: string;
  workspaceName: string;
  hasOperationsConsoleAccess: boolean;
  isBetaEligible: boolean;
  inviteShareData: InviteShareData;
  children?: React.ReactNode;
}

/**
 * Inner wrapper — needs InviteShareProvider already mounted above it.
 * Consumes context for the invite modal + wires ⌘K to CommandPalette.
 */
function ShellInner({
  userName,
  userInitial,
  hasOperationsConsoleAccess,
  isBetaEligible,
  inviteShareData,
  children,
}: DashboardV2FullShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  // ⌘K / Ctrl+K global listener
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="dark bg-[#0B0F15] text-slate-50 h-[100dvh] overflow-hidden">
      {/* ── Desktop sidebar (fixed left, hidden on mobile) ───────────────── */}
      <DashboardV2Sidebar hasOperationsConsoleAccess={hasOperationsConsoleAccess} />

      {/* ── Desktop top bar (fixed top-right, hidden on mobile) ──────────── */}
      <DashboardV2TopBar
        userName={userName}
        userInitial={userInitial}
        isBetaEligible={isBetaEligible}
        onSearchClick={openPalette}
      />

      {/* ── Mobile header (fixed top, hidden on desktop) ──────────────────── */}
      <DashboardV2MobileHeader userName={userName} userInitial={userInitial} />

      {/* ── Main scrollable content ───────────────────────────────────────── */}
      <main
        className="h-full overflow-y-auto lg:ml-64 lg:pt-16 pt-14 pb-[76px] lg:pb-0"
        style={{
          background:
            "radial-gradient(circle at top, rgba(245,158,11,0.07), transparent 32%), #0B0F15",
        }}
      >
        <div className="min-h-full p-4 lg:p-6">{children}</div>
      </main>

      {/* ── Mobile bottom nav (fixed, hidden on desktop) ──────────────────── */}
      <DashboardV2MobileNav />

      {/* ── Floating overlays ─────────────────────────────────────────────── */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        hasOperationsConsoleAccess={hasOperationsConsoleAccess}
      />

      {inviteOpen && (
        <InviteShareModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          {...inviteShareData}
        />
      )}
    </div>
  );
}

/**
 * DashboardV2FullShell — full-viewport shell for the V2 dashboard preview.
 *
 * Lives at /preview/dashboard-v2-full (outside the (dashboard) route group),
 * so it owns all providers. Does NOT import AppShell or any old shell component.
 */
export function DashboardV2FullShell(props: DashboardV2FullShellProps) {
  return (
    <TooltipProvider>
      <InviteShareProvider>
        <ShellInner {...props} />
      </InviteShareProvider>
    </TooltipProvider>
  );
}
