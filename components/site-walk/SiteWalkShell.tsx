"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteWalkSegmentedNav } from "@/components/site-walk/SiteWalkSegmentedNav";

/**
 * Site Walk shell — Phase 1 of redesign.
 * - Top bar: [← Back] [Project ▾] [···]
 * - Segmented top-tab nav (NOT a second bottom bar)
 * - Full-bleed routes (Live Walk, Plans canvas) hide the segmented nav
 *   so the canvas owns the screen. Full app-shell hide lands in Phase 3.
 */
export function SiteWalkShell({ children, userInitials = "SW", orgName = null }: { children: ReactNode; userInitials?: string; orgName?: string | null }) {
  const pathname = usePathname() ?? "";

  // Live Walk: /site-walk/walks/<id> (anything past /walks/)
  // Plans canvas: /site-walk/board
  const fullBleed =
    /^\/site-walk\/walks\/[^/]+/.test(pathname) ||
    pathname.startsWith("/site-walk/board");
  const hideSectionNav = pathname === "/site-walk";

  if (fullBleed) {
    return <div className="w-full min-w-0">{children}</div>;
  }

  return (
    <>
      {!hideSectionNav && <SiteWalkSegmentedNav />}
      <div className="w-full min-w-0">{children}</div>
    </>
  );
}
