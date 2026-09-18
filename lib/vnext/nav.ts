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

export const VNEXT_OWNER_NAV: readonly VnextNavItem[] = [
  ...VNEXT_OWNER_PRIMARY_NAV,
  ...VNEXT_OWNER_SECONDARY_NAV,
] as const;

export const VNEXT_ALL_NAV: readonly VnextNavItem[] = [
  ...VNEXT_CLIENT_NAV,
  ...VNEXT_OWNER_NAV,
] as const;

export const VNEXT_FORBIDDEN_NAV_PREFIXES = [
  "/dashboard",
  "/app",
  "/site-walk",
  "/twin",
  "/thermal-studio",
  "/operations-console",
  "/portal",
  "/tours",
  "/slatedrop",
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

export function vnextProjectHref(projectId: string): string {
  return `/vnext/projects/${projectId}`;
}

export function isSafeVnextNavHref(href: string): boolean {
  if (!href || href !== href.trim()) return false;
  const lower = href.toLowerCase();
  if (lower.startsWith("javascript:")) return false;
  if (href.startsWith("#")) return false;
  if (!href.startsWith("/vnext/")) return false;
  return !VNEXT_FORBIDDEN_NAV_PREFIXES.some(
    (prefix) => href === prefix || href.startsWith(`${prefix}/`),
  );
}
