"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { VnextLogo } from "@/components/vnext/VnextLogo";
import {
  VnextOwnerChrome,
  VnextOwnerDrawer,
  VnextOwnerSidebar,
} from "@/components/vnext/VnextOwnerChrome";
import { VNEXT_OWNER_PRIMARY_NAV, isVnextNavActive, vnextOwnerHomeHref } from "@/lib/vnext/nav";

type VnextOwnerShellProps = {
  children: ReactNode;
  pathname?: string;
  initialMenuOpen?: boolean;
};

function currentOwnerLabel(pathname: string): string {
  const match = VNEXT_OWNER_PRIMARY_NAV.find((item) => isVnextNavActive(pathname, item));
  if (match) return match.label;
  if (pathname.startsWith("/vnext/ops/settings")) return "Settings";
  if (pathname.startsWith("/vnext/ops/account")) return "Account";
  return "Home";
}

export function VnextOwnerShell({
  children,
  pathname,
  initialMenuOpen = false,
}: VnextOwnerShellProps) {
  const livePath = usePathname() ?? "/vnext/ops";
  const path = pathname ?? livePath;
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen);
  const titleId = useId();

  useEffect(() => {
    setMenuOpen(initialMenuOpen);
  }, [initialMenuOpen, path]);

  return (
    <VnextOwnerChrome
      sidebar={<VnextOwnerSidebar pathname={path} />}
      drawer={
        <VnextOwnerDrawer
          open={menuOpen}
          pathname={path}
          onClose={() => setMenuOpen(false)}
          titleId={titleId}
        />
      }
      header={
        <header className="sticky top-0 z-20 flex min-h-[var(--vnext-header-h)] items-center justify-between gap-3 border-b border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-[var(--vnext-pad-x)] pt-[env(safe-area-inset-top)]">
          <div className="flex min-w-0 items-center gap-3">
            <VnextLogo href={vnextOwnerHomeHref()} compact />
            <p className="m-0 truncate text-[length:var(--vnext-nav)] text-[var(--vnext-ink-secondary)] lg:hidden">
              {currentOwnerLabel(path)}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-[var(--vnext-touch)] items-center px-3 text-[length:var(--vnext-nav)] text-[var(--vnext-ink)] lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </button>
        </header>
      }
    >
      {children}
    </VnextOwnerChrome>
  );
}
