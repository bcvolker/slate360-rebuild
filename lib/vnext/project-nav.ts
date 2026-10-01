import type { VnextNavItem } from "./nav";
import { vnextProjectHref } from "./nav";

export function vnextProjectNavItems(projectId: string): readonly VnextNavItem[] {
  const base = vnextProjectHref(projectId);
  return [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/explore`, label: "Explore" },
    { href: `${base}/items`, label: "Items" },
    { href: `${base}/documents`, label: "Documents" },
    { href: `${base}/history`, label: "History" },
  ] as const;
}
