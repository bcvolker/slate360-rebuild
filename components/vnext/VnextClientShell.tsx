"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { VnextLogo } from "@/components/vnext/VnextLogo";
import { VnextNavLink } from "@/components/vnext/VnextNavLink";
import { VNEXT_CLIENT_NAV, vnextClientHomeHref } from "@/lib/vnext/nav";

type VnextClientShellProps = {
  children: ReactNode;
  pathname?: string;
};

export function VnextClientShell({ children, pathname }: VnextClientShellProps) {
  const livePath = usePathname() ?? "/vnext/projects";
  const path = pathname ?? livePath;

  return (
    <div
      data-vnext-shell="client"
      className="flex min-h-[100dvh] min-w-0 flex-col bg-[var(--vnext-canvas)]"
    >
      <header
        className="sticky top-0 z-20 flex min-h-[var(--vnext-header-h)] items-center justify-between gap-4 border-b border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-[var(--vnext-pad-x)] pt-[env(safe-area-inset-top)]"
      >
        <VnextLogo href={vnextClientHomeHref()} />
        <nav aria-label="Client" className="flex min-w-0 items-stretch">
          {VNEXT_CLIENT_NAV.map((item) => (
            <VnextNavLink key={item.href} item={item} pathname={path} variant="header" />
          ))}
        </nav>
      </header>
      <main className="min-w-0 flex-1 pb-[env(safe-area-inset-bottom)]">{children}</main>
    </div>
  );
}
