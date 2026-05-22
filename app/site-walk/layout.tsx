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
 * Provides AuthedAppShell auth protection for all /site-walk routes.
 *
 * `/site-walk` home uses SiteWalkV1Shell (fixed MobileAppShell overlay).
 * Sub-routes use SiteWalkShell in nested act/more/items layouts.
 * Capture and walk review overlay with their own fixed task shells (unchanged).
 */
export default function SiteWalkLayout({ children }: { children: ReactNode }) {
  return <AuthedAppShell>{children}</AuthedAppShell>;
}
