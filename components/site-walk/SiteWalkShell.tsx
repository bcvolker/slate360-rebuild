import type { ReactNode } from "react";

/**
 * Site Walk shell.
 * The authenticated Slate360 app shell already owns the header, share action,
 * settings entry, and global navigation. Site Walk must not add a second
 * module topbar or segmented page nav above its route content.
 */
export function SiteWalkShell({ children }: { children: ReactNode; userInitials?: string; orgName?: string | null }) {
  return <div className="w-full min-w-0">{children}</div>;
}
