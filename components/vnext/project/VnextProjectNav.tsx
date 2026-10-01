"use client";

import { usePathname } from "next/navigation";
import { VnextNavLink } from "@/components/vnext/VnextNavLink";
import type { VnextNavItem } from "@/lib/vnext/nav";
import { vnextProjectNavItems } from "@/lib/vnext/project-nav";

type Props = {
  projectId: string;
  pathname?: string;
  items?: readonly VnextNavItem[];
};

export function VnextProjectNav({ projectId, pathname, items: itemsOverride }: Props) {
  const livePath = usePathname() ?? "";
  const path = pathname ?? livePath;
  const items = itemsOverride ?? vnextProjectNavItems(projectId);

  return (
    <nav
      aria-label="Project"
      className="flex min-w-0 items-stretch overflow-x-auto border-b border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-3 sm:px-[var(--vnext-pad-x)]"
    >
      {items.map((item) => (
        <VnextNavLink key={item.href} item={item} pathname={path} variant="header" />
      ))}
    </nav>
  );
}
