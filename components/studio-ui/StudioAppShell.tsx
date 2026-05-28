"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { FolderOpen, Home, MapPin, User } from "lucide-react";
import {
  MobilePlatformHeader,
  MobileShell,
  MobileBottomNav,
  type MobileBottomNavItem,
} from "@/components/mobile-system";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import { isSiteWalkPassthroughShellPath } from "@/lib/site-walk/site-walk-shell-paths";
import {
  isDigitalTwinPassthroughShellPath,
  isDigitalTwinPlatformBypassPath,
} from "@/lib/digital-twin/digital-twin-shell-paths";
import type { InviteShareData } from "@/lib/types/invite";

/** Site Walk sub-routes and task surfaces keep their own chrome; home stays in platform shell. */
function isSiteWalkPlatformBypassPath(pathname: string): boolean {
  if (pathname === "/site-walk") return false;
  return pathname.startsWith("/site-walk/");
}

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
    isSiteWalkPlatformBypassPath(pathname) ||
    isSiteWalkPassthroughShellPath(pathname) ||
    isDigitalTwinPlatformBypassPath(pathname) ||
    isDigitalTwinPassthroughShellPath(pathname);
  const activeKey = activeNavKey(pathname);
  const isModuleHome = pathname === "/site-walk" || pathname === "/digital-twin";
  const mobileRoute = pathname.startsWith("/site-walk")
    ? "site-walk"
    : pathname.startsWith("/digital-twin")
      ? "digital-twin"
      : "app";
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();

  const content = fullBleed ? (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#0B0F15]">{children}</div>
  ) : (
    <MobileShell
      mobileRoute={mobileRoute}
      header={<MobilePlatformHeader showBackToApp={isModuleHome} inviteShareData={inviteShareData} />}
      bottomNav={<MobileBottomNav items={NAV_ITEMS} activeKey={activeKey} ariaLabel="Platform" />}
    >
      {children}
    </MobileShell>
  );

  return (
    <>
      {content}
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
    <InviteShareProvider inviteShareData={props.inviteShareData}>
      <StudioAppShellInner {...props} />
    </InviteShareProvider>
  );
}
