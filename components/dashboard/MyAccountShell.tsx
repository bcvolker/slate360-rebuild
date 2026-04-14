"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { User, CreditCard, BarChart3, Shield, Bell } from "lucide-react";
import DashboardTabShell from "@/components/shared/DashboardTabShell";
import AccountProfileTab from "./my-account/AccountProfileTab";
import AccountBillingTab from "./my-account/AccountBillingTab";
import AccountDataTrackerTab from "./my-account/AccountDataTrackerTab";
import AccountSecurityTab from "./my-account/AccountSecurityTab";
import AccountNotificationsTab from "./my-account/AccountNotificationsTab";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import type { Tier } from "@/lib/entitlements";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "billing", label: "Billing & Payments", icon: CreditCard },
  { id: "data", label: "Data Tracker", icon: BarChart3 },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
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

  // Filter tabs: enterprise non-admins should not see billing
  const visibleTabs = TABS.filter((t) => {
    if (t.id === "billing" && !isAdmin) return false;
    return true;
  });

  return (
    <DashboardTabShell
      user={{ name: user.name, email: user.email, avatar: user.avatar }}
      tier={tier}
      isCeo={isCeo}
      internalAccess={internalAccess}
      title="My Account"
      icon={User}
      accent="#D4AF37"
      status="live"
    >
      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 -mx-1 px-1">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                active
                  ? "border-[#D4AF37] text-[#D4AF37]"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "profile" && (
          <AccountProfileTab user={user} orgName={orgName} role={role} />
        )}
        {activeTab === "billing" && (
          <AccountBillingTab
            overview={overview}
            isAdmin={isAdmin}
            tierLabel={entitlements.label}
            loading={loading}
          />
        )}
        {activeTab === "data" && (
          <AccountDataTrackerTab
            overview={overview}
            isAdmin={isAdmin}
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
      </div>
    </DashboardTabShell>
  );
}
