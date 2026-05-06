import type { ReactNode } from "react";
import { SiteWalkModuleNav } from "./SiteWalkModuleNav";

/**
 * Site Walk shell.
 * The authenticated Slate360 app shell owns the global frame. Site Walk owns a
 * compact internal module nav so users can move directly between setup, walks,
 * plans, capture, and reports without landing on marketing-style pages.
 */
export function SiteWalkShell({ children, orgName }: { children: ReactNode; userInitials?: string; orgName?: string | null }) {
  return (
    <div className="w-full min-w-0 bg-[#0B0F15]">
      <SiteWalkModuleNav orgName={orgName} />
      {children}
    </div>
  );
}
