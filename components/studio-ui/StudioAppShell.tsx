"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Home, MapPin, User } from "lucide-react";
import { MobileAppShell, MobileBottomNav, type MobileBottomNavItem } from "@/components/mobile-system";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { isSiteWalkFullBleedPath } from "@/lib/site-walk/site-walk-shell-paths";
import type { InviteShareData } from "@/lib/types/invite";

type NavKey = "home" | "site-walk" | "projects" | "account";

const NAV_ITEMS: MobileBottomNavItem<NavKey>[] = [
  { key: "home", label: "Home", href: "/app", icon: Home },
  { key: "site-walk", label: "Site Walk", href: "/site-walk", icon: MapPin },
  { key: "projects", label: "Projects", href: "/projects", icon: FolderOpen },
  { key: "account", label: "Account", href: "/more", icon: User },
];

function activeNavKey(pathname: string): NavKey {
  if (pathname.startsWith("/site-walk")) return "site-walk";
  if (pathname.startsWith("/projects") || pathname.startsWith("/project-hub")) return "projects";
  if (pathname.startsWith("/more") || pathname.startsWith("/settings") || pathname.startsWith("/my-account")) {
    return "account";
  }
  return "home";
}

type StudioAppShellProps = {
  userName: string;
  workspaceName?: string | null;
  inviteShareData: InviteShareData;
  children: ReactNode;
};

export function StudioAppShell({ userName, workspaceName, children }: StudioAppShellProps) {
  const pathname = usePathname() ?? "";
  const fullBleed = isSiteWalkFullBleedPath(pathname);
  const activeKey = activeNavKey(pathname);

  if (fullBleed) {
    return <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#0B0F15]">{children}</div>;
  }

  return (
    <MobileAppShell
      className="relative min-h-[100dvh]"
      mobileRoute="app"
      header={
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#0B0F15]/90 px-4 backdrop-blur-xl">
          <Link href="/app" className="shrink-0">
            <Slate360Logo variant="dark" />
          </Link>
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-medium text-[#FFFFFF]">{workspaceName ?? "Slate360"}</p>
            <p className="truncate text-xs text-[#A3AED0]">{userName}</p>
          </div>
        </header>
      }
      bottomNav={<MobileBottomNav items={NAV_ITEMS} activeKey={activeKey} ariaLabel="Platform" />}
      mainClassName="min-h-0"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </MobileAppShell>
  );
}
