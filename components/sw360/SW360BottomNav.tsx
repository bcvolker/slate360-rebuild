"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Camera, Inbox, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { SAFE_AREA_INSET_BOTTOM } from "@/lib/capacitor/safe-area-inset";

const TABS = [
  { href: "/sw360", label: "Home", icon: Home, raised: false },
  { href: "/sw360/projects", label: "Projects", icon: FolderKanban, raised: false },
  { href: "/sw360/capture", label: "Capture", icon: Camera, raised: true },
  { href: "/sw360/inbox", label: "Inbox", icon: Inbox, raised: false },
  { href: "/sw360/reports", label: "Reports", icon: FileText, raised: false },
] as const;

/**
 * The 5-tab nav frame (Home · Projects · Capture(raised) · Inbox · Reports)
 * locked in docs/design/SITEWALK360_LOCK_SHEET.md.
 *
 * On-device fix: flex-1 items need min-w-0 to actually shrink — without it a
 * flex child refuses to go below its content's natural width, so with 5 tabs
 * on a ~390px phone the longer labels ("Projects", "Reports") overflowed
 * their cell and got visually clipped by the screen's rounded corners. Same
 * bottom-safe-area pattern as MobileBottomNav.tsx (SAFE_AREA_INSET_BOTTOM,
 * not a fixed height) so labels clear the iPhone home-indicator bar too.
 */
export function SW360BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm"
      style={{ paddingBottom: SAFE_AREA_INSET_BOTTOM }}
    >
      {TABS.map((tab) => {
        const active = tab.href === "/sw360" ? pathname === "/sw360" : pathname?.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[9.5px] font-bold uppercase leading-none",
              active ? "text-[var(--sw360-green-light)]" : "text-[var(--sw360-charcoal)]/50",
            )}
          >
            {tab.raised ? (
              <span
                className={cn(
                  "-mt-6 flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-lg",
                  active
                    ? "bg-[var(--sw360-green-light)] text-white"
                    : "bg-[var(--sw360-charcoal)] text-white",
                )}
              >
                <Icon size={20} />
              </span>
            ) : (
              <Icon size={18} className="shrink-0" />
            )}
            <span className="w-full truncate text-center">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
