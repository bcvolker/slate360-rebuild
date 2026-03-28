"use client";

import Link from "next/link";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import type { Tier } from "@/lib/entitlements";
import { Shield, Activity, ArrowRight, Loader2 } from "lucide-react";
import AccountOverviewRow from "@/components/dashboard/AccountOverviewRow";
import AccountPreferencesCard from "@/components/dashboard/AccountPreferencesCard";
import AccountAdminCards from "@/components/dashboard/AccountAdminCards";

/* ================================================================
   TYPES
   ================================================================ */

interface DashboardMyAccountProps {
  user: { name: string; email: string };
  accountOverview: DashboardAccountOverview | null;
  accountLoading: boolean;
  accountError: string | null;
  apiKeyError: string | null;
  storageUsed: number;
  entitlements: { maxStorageGB: number; label: string; tier: Tier };
  isClient: boolean;

  /* Actions */
  onRefresh: () => void;
  onOpenBillingPortal: () => void;
  onBuyCredits: () => void;
  onUpgradePlan: () => void;
  onApplyPreset: (preset: "simple" | "creator" | "project") => void;
  onCopyText: (value: string, label: string) => void;
  onGenerateApiKey: () => void;
  onRevokeApiKey: (id: string) => void;
  onSavePreferences: () => void;
  onBackToOverview: () => void;
  onSetNotice: (notice: { ok: boolean; text: string } | null) => void;

  /* API key state */
  apiKeyLabel: string;
  onApiKeyLabelChange: (value: string) => void;
  apiKeyBusy: "create" | string | null;
  generatedApiKey: string | null;

  /* Preferences state */
  prefTheme: "light" | "dark" | "system";
  onPrefThemeChange: (value: "light" | "dark" | "system") => void;
  prefStartTab: string;
  onPrefStartTabChange: (value: string) => void;
  prefNotification: "off" | "daily" | "weekly";
  onPrefNotificationChange: (value: "off" | "daily" | "weekly") => void;
  prefImportantAlerts: boolean;
  onPrefImportantAlertsChange: (value: boolean) => void;
  prefShowDashboardTiles: boolean;
  onPrefShowDashboardTilesChange: (value: boolean) => void;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function DashboardMyAccount({
  user,
  accountOverview,
  accountLoading,
  accountError,
  apiKeyError,
  storageUsed,
  entitlements: ent,
  isClient,
  onRefresh,
  onOpenBillingPortal,
  onBuyCredits,
  onUpgradePlan,
  onApplyPreset,
  onCopyText,
  onGenerateApiKey,
  onRevokeApiKey,
  onSavePreferences,
  onBackToOverview,
  onSetNotice,
  apiKeyLabel,
  onApiKeyLabelChange,
  apiKeyBusy,
  generatedApiKey,
  prefTheme,
  onPrefThemeChange,
  prefStartTab,
  onPrefStartTabChange,
  prefNotification,
  onPrefNotificationChange,
  prefImportantAlerts,
  onPrefImportantAlertsChange,
  prefShowDashboardTiles,
  onPrefShowDashboardTilesChange,
}: DashboardMyAccountProps) {
  const usagePct = accountOverview
    ? accountOverview.usage.storageUsedGb / Math.max(accountOverview.usage.storageLimitGb, 1)
    : storageUsed / Math.max(ent.maxStorageGB, 1);
  const usageHealth = usagePct < 0.7 ? "Healthy" : usagePct < 0.9 ? "Watch" : "Critical";
  const usageHealthClass =
    usagePct < 0.7
      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
      : usagePct < 0.9
        ? "text-amber-600 bg-amber-50 border-amber-200"
        : "text-red-600 bg-red-50 border-red-200";
  const isAdmin = accountOverview?.isAdmin ?? false;
  const completionChecks = [
    Boolean(accountOverview?.profile.name),
    Boolean(accountOverview?.profile.email),
    Boolean(accountOverview?.profile.orgName),
    Boolean(accountOverview?.profile.role),
    Boolean(prefTheme),
    Boolean(prefStartTab),
    Boolean(prefNotification),
  ];
  const profileCompletion = Math.round(
    (completionChecks.filter(Boolean).length / completionChecks.length) * 100,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-2xl font-bold text-white">My Account</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Profile, billing, and account controls.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          {accountLoading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Activity size={13} />
          )}{" "}
          Refresh
        </button>
      </div>

      {accountError && (
        <div className="rounded-xl border border-red-800/50 bg-red-950/30 text-red-400 px-4 py-3 text-sm">
          {accountError}
        </div>
      )}

      {apiKeyError && (
        <div className="rounded-xl border border-red-800/50 bg-red-950/30 text-red-400 px-4 py-3 text-sm">
          {apiKeyError}
        </div>
      )}

      <div className="text-[11px] text-zinc-500 px-1">
        {isAdmin
          ? "Owner/Admin view: full account controls enabled."
          : "Member view: personal settings and read-only plan summary."}
      </div>

      {/* ── Top row: At A Glance + Subscription ── */}
      <AccountOverviewRow
        user={user}
        accountOverview={accountOverview}
        accountLoading={accountLoading}
        storageUsed={storageUsed}
        entitlements={ent}
        isAdmin={isAdmin}
        usageHealth={usageHealth}
        usageHealthClass={usageHealthClass}
        profileCompletion={profileCompletion}
        onApplyPreset={onApplyPreset}
        onOpenBillingPortal={onOpenBillingPortal}
        onBuyCredits={onBuyCredits}
        onUpgradePlan={onUpgradePlan}
        onBackToOverview={onBackToOverview}
      />

      {/* ── Bottom grid: Preferences, Security, Data, API, Audit ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AccountPreferencesCard
          prefTheme={prefTheme}
          onPrefThemeChange={onPrefThemeChange}
          prefStartTab={prefStartTab}
          onPrefStartTabChange={onPrefStartTabChange}
          prefNotification={prefNotification}
          onPrefNotificationChange={onPrefNotificationChange}
          prefImportantAlerts={prefImportantAlerts}
          onPrefImportantAlertsChange={onPrefImportantAlertsChange}
          prefShowDashboardTiles={prefShowDashboardTiles}
          onPrefShowDashboardTilesChange={onPrefShowDashboardTilesChange}
          onSavePreferences={onSavePreferences}
          profileCompletion={profileCompletion}
        />

        <WidgetCard icon={Shield} title="Security & Access">
          <div className="space-y-2">
            <Link
              href="/forgot-password"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 transition-colors"
            >
              <span className="text-xs font-semibold text-zinc-300">
                Reset password
              </span>
              <ArrowRight size={12} className="text-zinc-500" />
            </Link>
            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 transition-colors text-left">
              <span className="text-xs font-semibold text-zinc-300">
                2FA status
              </span>
              <span className="text-[11px] font-semibold text-zinc-500">
                Coming soon
              </span>
            </button>
            <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-300">
                  Recent sessions
                </span>
                <span className="text-[11px] font-semibold text-zinc-500">
                  Last 3
                </span>
              </div>
              <div className="space-y-1.5">
                {(accountOverview?.sessions ?? []).slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-zinc-300 truncate">
                        {session.device}
                      </p>
                      <p className="text-[10px] text-zinc-500">{session.ip}</p>
                    </div>
                    <p className="text-[10px] text-zinc-500 shrink-0">
                      {isClient && session.lastActive
                        ? new Date(session.lastActive).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </WidgetCard>

        {isAdmin && (
          <AccountAdminCards
            accountOverview={accountOverview}
            storageUsed={storageUsed}
            entitlements={ent}
            isClient={isClient}
            onSetNotice={onSetNotice}
            onCopyText={onCopyText}
            onGenerateApiKey={onGenerateApiKey}
            onRevokeApiKey={onRevokeApiKey}
            apiKeyLabel={apiKeyLabel}
            onApiKeyLabelChange={onApiKeyLabelChange}
            apiKeyBusy={apiKeyBusy}
            generatedApiKey={generatedApiKey}
          />
        )}
      </div>
    </div>
  );
}
