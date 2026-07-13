"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Camera, Inbox, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/sw360", label: "Home", icon: Home, raised: false },
  { href: "/sw360/projects", label: "Projects", icon: FolderKanban, raised: false },
  { href: "/sw360/capture", label: "Capture", icon: Camera, raised: true },
  { href: "/sw360/inbox", label: "Inbox", icon: Inbox, raised: false },
  { href: "/sw360/reports", label: "Reports", icon: FileText, raised: false },
] as const;

/**
 * The 5-tab nav frame (Home · Projects · Capture(raised) · Inbox · Reports)
 * locked in docs/design/SITEWALK360_LOCK_SHEET.md. Capture is visually raised
 * — it's the app's core loop, not a peer destination.
 */
export function SW360BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch justify-around border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      {TABS.map((tab) => {
        const active = tab.href === "/sw360" ? pathname === "/sw360" : pathname?.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide",
              active ? "text-[var(--sw360-green-light)]" : "text-[var(--sw360-charcoal)]/50",
            )}
          >
            {tab.raised ? (
              <span
                className={cn(
                  "-mt-6 flex h-12 w-12 items-center justify-center rounded-full shadow-lg",
                  active
                    ? "bg-[var(--sw360-green-light)] text-white"
                    : "bg-[var(--sw360-charcoal)] text-white",
                )}
              >
                <Icon size={20} />
              </span>
            ) : (
              <Icon size={18} />
            )}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
