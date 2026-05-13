import type { ReactNode } from "react";
import { SiteWalkModuleNav } from "./SiteWalkModuleNav";

/**
 * Site Walk shell — rigid viewport containment.
 *
 * The shell is a strict flexbox column that fills the bounded viewport height
 * from the parent AuthedAppShell. The module nav is shrink-0 (fixed height),
 * and children fill the remaining space with internal scrolling only.
 *
 * This prevents scroll bleed: no child content can push past the viewport.
 * The capture route has its own fixed-position task shell (z-50) that overlays
 * this nav entirely — so the nav renders but is hidden during capture.
 */
export function SiteWalkShell({ children, orgName }: { children: ReactNode; userInitials?: string; orgName?: string | null }) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#0B0F15]">
      <div className="shrink-0">
        <SiteWalkModuleNav orgName={orgName} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
