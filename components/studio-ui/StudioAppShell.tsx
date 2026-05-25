"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, Home, MapPin, User } from "lucide-react";
import { MobileAppShell, MobileBottomNav, type MobileBottomNavItem } from "@/components/mobile-system";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { StudioMobileHeaderActions } from "@/components/studio-ui/StudioMobileHeaderActions";
import { isSiteWalkPassthroughShellPath } from "@/lib/site-walk/site-walk-shell-paths";

/** Site Walk sub-routes and task surfaces keep their own chrome; home stays in platform shell. */
function isSiteWalkPlatformBypassPath(pathname: string): boolean {
  if (pathname === "/site-walk") return false;
  return pathname.startsWith("/site-walk/");
}
import type { InviteShareData } from "@/lib/types/invite";

const InviteShareModal = dynamic(
  () => import("@/components/shared/InviteShareModal").then((mod) => mod.InviteShareModal),
  { ssr: false },
);

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

function StudioAppShellInner({ inviteShareData, children }: StudioAppShellProps) {
  const pathname = usePathname() ?? "";
  const fullBleed =
    isSiteWalkPlatformBypassPath(pathname) || isSiteWalkPassthroughShellPath(pathname);
  const activeKey = activeNavKey(pathname);
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();

  if (fullBleed) {
    return <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#0B0F15]">{children}</div>;
  }

  return (
    <>
      <MobileAppShell
        className="relative min-h-[100dvh]"
        mobileRoute="app"
        header={
          <header
            className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#0B0F15]/90 px-4 backdrop-blur-xl"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <Link href="/app" className="min-w-0 shrink-0">
              <Slate360Logo variant="dark" />
            </Link>
            <div className="ml-auto flex shrink-0 items-center [&>div:first-child]:flex-row-reverse">
              <StudioMobileHeaderActions inviteShareData={inviteShareData} />
            </div>
          </header>
        }
        bottomNav={<MobileBottomNav items={NAV_ITEMS} activeKey={activeKey} ariaLabel="Platform" />}
        mainClassName="min-h-0"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </MobileAppShell>

      {inviteOpen ? (
        <InviteShareModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          {...inviteShareData}
        />
      ) : null}
    </>
  );
}

export function StudioAppShell(props: StudioAppShellProps) {
  return (
    <InviteShareProvider>
      <StudioAppShellInner {...props} />
    </InviteShareProvider>
  );
}
