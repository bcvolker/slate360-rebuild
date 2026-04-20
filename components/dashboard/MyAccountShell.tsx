"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Bell,
  Building2,
  CreditCard,
  Database,
  FileText,
  KeyRound,
  Lock,
  Settings,
  Shield,
  Users,
  User,
} from "lucide-react";
import DashboardTabShell from "@/components/shared/DashboardTabShell";
import AccountProfileTab from "./my-account/AccountProfileTab";
import AccountBillingTab from "./my-account/AccountBillingTab";
import AccountDataTrackerTab from "./my-account/AccountDataTrackerTab";
import AccountSecurityTab from "./my-account/AccountSecurityTab";
import AccountNotificationsTab from "./my-account/AccountNotificationsTab";
import { ComingSoonEmptyState } from "@/components/shared/ComingSoonEmptyState";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import type { Tier } from "@/lib/entitlements";

// Tab IA — grouped by section. Each tab declares which audience can see it:
//   - everyone: all signed-in users
//   - admin:    org owner/admin only (workspace + billing surfaces)
//
// Enterprise admins control which non-admin members see billing/data via
// `permissions` on the org_members row (future). Today we gate by `isAdmin`.
const TABS = [
  // PROFILE
  { id: "profile",       group: "Profile",      label: "Profile",         icon: User,     audience: "everyone" },
  { id: "preferences",   group: "Profile",      label: "Preferences",     icon: Settings, audience: "everyone" },
  { id: "notifications", group: "Profile",      label: "Notifications",   icon: Bell,     audience: "everyone" },
  { id: "sessions",      group: "Profile",      label: "Sessions",        icon: Activity, audience: "everyone" },

  // SECURITY
  { id: "security",      group: "Security",     label: "Password & 2FA",  icon: Lock,     audience: "everyone" },
  { id: "login-history", group: "Security",     label: "Login History",   icon: KeyRound, audience: "everyone" },

  // WORKSPACE
  { id: "workspace",     group: "Workspace",    label: "General",         icon: Building2, audience: "admin" },
  { id: "members",       group: "Workspace",    label: "Members & Roles", icon: Users,     audience: "admin" },
  { id: "permissions",   group: "Workspace",    label: "Permissions",     icon: Shield,    audience: "admin" },
  { id: "audit",         group: "Workspace",    label: "Audit Log",       icon: FileText,  audience: "admin" },

  // BILLING
  { id: "billing",       group: "Billing",      label: "Plan & Billing",  icon: CreditCard, audience: "admin" },
  { id: "data",          group: "Billing",      label: "Usage & Credits", icon: Database,   audience: "admin" },

  // DATA & PRIVACY
  { id: "privacy",       group: "Data & Privacy", label: "Privacy & Data", icon: Database, audience: "everyone" },
  { id: "legal",         group: "Data & Privacy", label: "Legal",          icon: FileText, audience: "everyone" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  user: { id: string; name: string; email: string; avatar?: string };
  orgName: string;
  tier: Tier;
  role: string;
  isAdmin: boolean;
  isCeo?: boolean;
  entitlements: {
    label: string;
    maxCredits: number;
    maxStorageGB: number;
    maxSeats: number;
    canManageSeats: boolean;
  };
  internalAccess?: { operationsConsole?: boolean };
}

export default function MyAccountShell({ user, orgName, tier, role, isAdmin, isCeo, entitlements, internalAccess }: Props) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get("tab") as TabId) || "profile";
  const [activeTab, setActiveTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? initialTab : "profile");
  const [overview, setOverview] = useState<DashboardAccountOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/account/overview")
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setOverview(data as DashboardAccountOverview); })
      .catch(() => { /* fail silently, show empty state */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const switchToBilling = useCallback(() => setActiveTab("billing"), []);

  // Audience filter: non-admins never see admin-only tabs.
  // Future: per-member `permissions` row will further restrict billing/data
  // for delegated admins (e.g. Enterprise managers without billing access).
  const visibleTabs = TABS.filter((t) => {
    if (t.audience === "admin" && !isAdmin) return false;
    return true;
  });

  // Group tabs for the left rail, preserving declaration order within group.
  const groupOrder = ["Profile", "Security", "Workspace", "Billing", "Data & Privacy"] as const;
  const grouped = groupOrder
    .map((g) => ({ group: g, items: visibleTabs.filter((t) => t.group === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <DashboardTabShell
      user={{ name: user.name, email: user.email, avatar: user.avatar }}
      tier={tier}
      isCeo={isCeo}
      internalAccess={internalAccess}
      title="My Account"
      icon={User}
      accent="#3B82F6"
      status="live"
      showCustomize={false}
    >
      {/* Two-column layout: left tab rail (grouped) + right content */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <nav className="md:sticky md:top-20 md:self-start space-y-5">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {group}
              </p>
              <ul className="space-y-0.5">
                {items.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                          active
                            ? "bg-white/[0.06] text-white border-l-2 border-teal pl-[10px]"
                            : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                        }`}
                      >
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="min-w-0">
        {activeTab === "profile" && (
          <AccountProfileTab user={user} orgName={orgName} role={role} />
        )}
        {activeTab === "preferences" && (
          <ComingSoonEmptyState title="Preferences" />
        )}
        {activeTab === "sessions" && (
          <ComingSoonEmptyState title="Sessions & Devices" />
        )}
        {activeTab === "login-history" && (
          <ComingSoonEmptyState title="Login History" />
        )}
        {activeTab === "workspace" && (
          <ComingSoonEmptyState title="Workspace General" />
        )}
        {activeTab === "members" && (
          <ComingSoonEmptyState title="Members & Roles" />
        )}
        {activeTab === "permissions" && (
          <ComingSoonEmptyState title="Permissions" />
        )}
        {activeTab === "audit" && (
          <ComingSoonEmptyState title="Audit Log" />
        )}
        {activeTab === "billing" && (
          <AccountBillingTab
            overview={overview}
            isAdmin={isAdmin}
            isCeo={Boolean(isCeo)}
            tierLabel={entitlements.label}
            loading={loading}
          />
        )}
        {activeTab === "data" && (
          <AccountDataTrackerTab
            overview={overview}
            isAdmin={isAdmin}
            isCeo={Boolean(isCeo)}
            maxCredits={entitlements.maxCredits}
            maxStorageGB={entitlements.maxStorageGB}
            tierLabel={entitlements.label}
            loading={loading}
            onBuyCredits={switchToBilling}
          />
        )}
        {activeTab === "security" && (
          <AccountSecurityTab overview={overview} userEmail={user.email} loading={loading} />
        )}
        {activeTab === "notifications" && (
          <AccountNotificationsTab />
        )}
        {activeTab === "privacy" && (
          <ComingSoonEmptyState title="Privacy & Data" />
        )}
        {activeTab === "legal" && (
          <ComingSoonEmptyState title="Legal" />
        )}
        </div>
      </div>
    </DashboardTabShell>
  );
}
