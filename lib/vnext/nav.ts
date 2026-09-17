export type VnextNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export const VNEXT_CLIENT_NAV: readonly VnextNavItem[] = [
  { href: "/vnext/projects", label: "Projects" },
  { href: "/vnext/account", label: "Account" },
] as const;

export const VNEXT_OWNER_PRIMARY_NAV: readonly VnextNavItem[] = [
  { href: "/vnext/ops", label: "Home", exact: true },
  { href: "/vnext/ops/clients", label: "Clients" },
  { href: "/vnext/ops/projects", label: "Projects" },
  { href: "/vnext/ops/processing", label: "Processing" },
  { href: "/vnext/ops/qa", label: "QA & Publish" },
  { href: "/vnext/ops/shares", label: "Shares" },
] as const;

export const VNEXT_OWNER_SECONDARY_NAV: readonly VnextNavItem[] = [
  { href: "/vnext/ops/settings", label: "Settings" },
  { href: "/vnext/ops/account", label: "Account" },
] as const;

export function isVnextNavActive(pathname: string, item: VnextNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function vnextOwnerHomeHref(): string {
  return "/vnext/ops";
}

export function vnextClientHomeHref(): string {
  return "/vnext/projects";
}
