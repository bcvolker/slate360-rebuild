import type { ReactNode } from "react";
import type { Metadata } from "next";
import AuthedAppShell from "@/components/dashboard/AuthedAppShell";

export const metadata: Metadata = {
  title: "Site Walk — Slate360",
  description: "Field capture, plan walks, and deliverables for construction teams.",
};

/**
 * Top-level Site Walk layout.
 *
 * Provides AuthedAppShell (auth protection, topbar, sidebar, mobile nav,
 * InviteShareProvider, CommandPalette) for all /site-walk routes.
 *
 * SiteWalkShell is intentionally removed here — the production Home
 * (SiteWalkHomeClient) owns the full viewport via SiteWalkV1Shell which uses
 * `fixed inset-0 z-50` to overlay the AppShell chrome.
 *
 * Sub-route groups (act-1-setup, act-2-inputs, act-3-outputs) and top-level
 * sub-routes (more, slatedrop, items) each have their own nested layout that
 * re-introduces SiteWalkShell for those pages.
 */
export default function SiteWalkLayout({ children }: { children: ReactNode }) {
  return <AuthedAppShell>{children}</AuthedAppShell>;
}

