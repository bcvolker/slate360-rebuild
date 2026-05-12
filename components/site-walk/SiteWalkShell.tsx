import type { ReactNode } from "react";
import { SiteWalkModuleNav } from "./SiteWalkModuleNav";

/**
 * Site Walk shell — rigid viewport containment.
 *
 * The shell is a strict flexbox column that fills the remaining viewport height
 * from the parent AuthedAppShell. The module nav is shrink-0 (fixed height),
 * and children fill the remaining space with internal scrolling only.
 *
 * This prevents scroll bleed: no child content can push past the viewport.
 * The capture route has its own fixed-position task shell (z-50) that overlays
 * this nav entirely — so the nav renders but is hidden during capture.
 */
export function SiteWalkShell({ children, orgName }: { children: ReactNode; userInitials?: string; orgName?: string | null }) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-[#0B0F15]">
      <div className="fixed top-0 left-0 w-full bg-green-500 text-black font-black text-center z-[9999] p-2">VER: UI-NUKE-02</div>
      <div className="shrink-0">
        <SiteWalkModuleNav orgName={orgName} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
