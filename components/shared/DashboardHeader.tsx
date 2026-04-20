/**
 * DashboardHeader — DEPRECATED / NEUTRALIZED
 *
 * This component used to render a full topbar (logo + ⌘K + quick nav +
 * notifications + user menu). It was rendered INSIDE the AppShell's
 * <main>, which already paints a topbar (DashboardTopBar). The result
 * was two stacked headers on every page that consumed this component
 * — that's the "extra header with extra search and extra avatar"
 * problem the user reported.
 *
 * Rather than rip out every call site, this component now returns null.
 * Callers can keep passing their old props; nothing renders. AppShell's
 * topbar is the ONE topbar.
 *
 * The command palette (⌘K) is now mounted globally by AppShell, so it
 * still works on every page. Do not re-add chrome here.
 */

import type { Tier } from "@/lib/entitlements";

export interface HeaderNotification {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  read?: boolean;
  href?: string;
}

export interface DashboardHeaderProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isCeo?: boolean;
  isAdmin?: boolean;
  internalAccess?: { operationsConsole?: boolean };
  showBackLink?: boolean;
  searchPlaceholder?: string;
  prefsDirty?: boolean;
  onCustomizeOpen?: () => void;
  notifications?: HeaderNotification[];
  notificationsLoading?: boolean;
  onRefreshNotifications?: () => void;
}

export default function DashboardHeader(_props: DashboardHeaderProps) {
  // Intentionally renders nothing. AppShell provides the topbar.
  return null;
}
