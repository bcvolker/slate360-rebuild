"use client";

import Link from "next/link";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import type { Tier } from "@/lib/entitlements";
import {
  User,
  CreditCard,
  Bell,
  Shield,
  Activity,
  FileText,
  ArrowRight,
  Loader2,
} from "lucide-react";

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
          <h2 className="text-2xl font-black text-gray-900">My Account</h2>
          <p className="text-sm text-gray-500 mt-1">
            Profile, billing, and account controls.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
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
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {accountError}
        </div>
      )}

      {apiKeyError && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {apiKeyError}
        </div>
      )}

      <div className="text-[11px] text-gray-500 px-1">
        {isAdmin
          ? "Owner/Admin view: full account controls enabled."
          : "Member view: personal settings and read-only plan summary."}
      </div>

      {/* ── Top row: At A Glance + Subscription ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <WidgetCard
          icon={User}
          title="Account At A Glance"
          span="xl:col-span-2"
          action={
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${usageHealthClass}`}
            >
              {usageHealth}
            </span>
          }
        >
          {accountLoading && !accountOverview ? (
            <div className="py-6 flex items-center justify-center text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading account
              details…
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Name
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {accountOverview?.profile.name ?? user.name}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Email
                  </p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {accountOverview?.profile.email ?? user.email}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Organization
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {accountOverview?.profile.orgName ?? "Slate360 Organization"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Role
                  </p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {accountOverview?.profile.role ?? "member"}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Storage Health
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(accountOverview?.usage.storageUsedGb ?? storageUsed).toFixed(1)}{" "}
                    /{" "}
                    {(
                      accountOverview?.usage.storageLimitGb ?? ent.maxStorageGB
                    ).toFixed(0)}{" "}
                    GB
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${usageHealthClass}`}
                >
                  {usageHealth}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => onApplyPreset("simple")}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Simple View
                </button>
                <button
                  onClick={() => onApplyPreset("creator")}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Creator View
                </button>
                <button
                  onClick={() => onApplyPreset("project")}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Project View
                </button>
              </div>
            </div>
          )}
        </WidgetCard>

        <WidgetCard
          icon={CreditCard}
          title={isAdmin ? "Subscription & Billing" : "Plan & Usage Summary"}
          action={
            <button
              onClick={onOpenBillingPortal}
              className="text-[11px] font-semibold text-[#FF4D00] hover:underline"
            >
              {isAdmin ? "Manage Billing" : "View Billing"}
            </button>
          }
        >
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Current Plan
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {accountOverview?.billing.plan ?? ent.label}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Status
              </p>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {accountOverview?.billing.status ?? "active"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Renewal
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {accountOverview?.billing.renewsOn
                  ? new Date(accountOverview.billing.renewsOn).toLocaleDateString()
                  : "Not available"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Seats
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {isAdmin
                  ? "4 used / 10 included"
                  : "Managed by your organization"}
              </p>
            </div>
            {isAdmin && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Plan Preview
                </p>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Starter</span>
                    <span className="font-semibold text-gray-700">
                      Basic access
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pro</span>
                    <span className="font-semibold text-gray-700">
                      Advanced tools
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Enterprise</span>
                    <span className="font-semibold text-gray-700">
                      Full suite
                    </span>
                  </div>
                </div>
              </div>
            )}
            {isAdmin ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={onBuyCredits}
                  className="text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Buy Credits
                </button>
                <button
                  onClick={onUpgradePlan}
                  className="text-xs font-semibold py-2 rounded-lg text-white hover:opacity-90 transition-all"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  Upgrade
                </button>
                <button
                  onClick={onBackToOverview}
                  className="text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Manage Seats
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-500">
                Read-only plan details. Billing controls are available for
                owner/admin roles.
              </p>
            )}
          </div>
        </WidgetCard>
      </div>

      {/* ── Bottom grid: Preferences, Security, Data, API, Audit ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <WidgetCard icon={Bell} title="Profile & Preferences">
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Theme
              </p>
              <select
                value={prefTheme}
                onChange={(e) =>
                  onPrefThemeChange(
                    e.target.value as "light" | "dark" | "system",
                  )
                }
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Default Start Tab
              </p>
              <select
                value={prefStartTab}
                onChange={(e) => onPrefStartTabChange(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="overview">Dashboard</option>
                <option value="project-hub">Project Hub</option>
                <option value="tours">360 Tours</option>
                <option value="content-studio">Content Studio</option>
              </select>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Notification Frequency
              </p>
              <select
                value={prefNotification}
                onChange={(e) =>
                  onPrefNotificationChange(
                    e.target.value as "off" | "daily" | "weekly",
                  )
                }
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="off">Off</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <label className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-700">
                Important Alerts
              </span>
              <input
                type="checkbox"
                checked={prefImportantAlerts}
                onChange={(e) => onPrefImportantAlertsChange(e.target.checked)}
                className="h-4 w-4 accent-[#FF4D00]"
              />
            </label>
            <label className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-700">
                Show Dashboard Tiles
              </span>
              <input
                type="checkbox"
                checked={prefShowDashboardTiles}
                onChange={(e) =>
                  onPrefShowDashboardTilesChange(e.target.checked)
                }
                className="h-4 w-4 accent-[#FF4D00]"
              />
            </label>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700">
                  Profile Completeness
                </span>
                <span className="text-xs font-bold text-gray-900">
                  {profileCompletion}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#FF4D00]"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
            <button
              onClick={onSavePreferences}
              className="w-full text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </WidgetCard>

        <WidgetCard icon={Shield} title="Security & Access">
          <div className="space-y-2">
            <Link
              href="/forgot-password"
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs font-semibold text-gray-700">
                Reset password
              </span>
              <ArrowRight size={12} className="text-gray-400" />
            </Link>
            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors text-left">
              <span className="text-xs font-semibold text-gray-700">
                2FA status
              </span>
              <span className="text-[11px] font-semibold text-gray-500">
                Coming soon
              </span>
            </button>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  Recent sessions
                </span>
                <span className="text-[11px] font-semibold text-gray-500">
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
                      <p className="text-[11px] font-semibold text-gray-700 truncate">
                        {session.device}
                      </p>
                      <p className="text-[10px] text-gray-400">{session.ip}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 shrink-0">
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
          <WidgetCard icon={Activity} title="Data & Storage">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Storage used</span>
                  <span className="text-xs font-bold text-gray-900">
                    {(
                      accountOverview?.usage.storageUsedGb ?? storageUsed
                    ).toFixed(1)}{" "}
                    GB /{" "}
                    {(
                      accountOverview?.usage.storageLimitGb ?? ent.maxStorageGB
                    ).toLocaleString()}{" "}
                    GB
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#FF4D00]"
                    style={{
                      width: `${Math.min(((accountOverview?.usage.storageUsedGb ?? storageUsed) / (accountOverview?.usage.storageLimitGb ?? ent.maxStorageGB)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Projects
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(
                      accountOverview?.usage.projectsCount ?? 0
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Models
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(accountOverview?.usage.modelsCount ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Tours
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(accountOverview?.usage.toursCount ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Documents
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {(accountOverview?.usage.docsCount ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Purchased Credits
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {(
                    accountOverview?.billing.purchasedCredits ?? 0
                  ).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  onSetNotice({
                    ok: true,
                    text: "Data export request submitted.",
                  })
                }
                className="w-full text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Download my data
              </button>
              <button
                onClick={() =>
                  onSetNotice({
                    ok: false,
                    text: "Deletion request started. Support will follow up.",
                  })
                }
                className="w-full text-xs font-semibold py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Request deletion
              </button>
            </div>
          </WidgetCard>
        )}

        {isAdmin && (
          <WidgetCard
            icon={FileText}
            title="API & Integrations"
            span="md:col-span-2 xl:col-span-2"
          >
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={apiKeyLabel}
                  onChange={(e) => onApiKeyLabelChange(e.target.value)}
                  placeholder="Key label (e.g. CI Runner)"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                />
                <button
                  onClick={onGenerateApiKey}
                  disabled={apiKeyBusy === "create"}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  {apiKeyBusy === "create" ? "Generating…" : "Generate Key"}
                </button>
              </div>
              {generatedApiKey && (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
                    Copy now — shown once
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-amber-800 truncate flex-1">
                      {generatedApiKey}
                    </p>
                    <button
                      onClick={() => onCopyText(generatedApiKey, "API key")}
                      className="text-[11px] font-semibold text-amber-700 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {(accountOverview?.apiKeys ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No active API keys yet.
                  </p>
                ) : (
                  (accountOverview?.apiKeys ?? []).map((key) => (
                    <div
                      key={key.id}
                      className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {key.label}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          ••••{key.lastFour} ·{" "}
                          {isClient && key.createdAt
                            ? new Date(key.createdAt).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          onCopyText(`••••${key.lastFour}`, "Key reference")
                        }
                        className="text-[11px] font-semibold text-gray-500 hover:text-gray-700"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => onRevokeApiKey(key.id)}
                        disabled={apiKeyBusy === key.id}
                        className="text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
                      >
                        {apiKeyBusy === key.id ? "Revoking…" : "Revoke"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </WidgetCard>
        )}

        {isAdmin && (
          <WidgetCard icon={Shield} title="Audit Log">
            <div className="space-y-2">
              {(accountOverview?.auditLog ?? []).length === 0 ? (
                <p className="text-xs text-gray-400">
                  No recent sensitive actions.
                </p>
              ) : (
                (accountOverview?.auditLog ?? []).slice(0, 5).map((event) => (
                  <div
                    key={event.id}
                    className="p-2.5 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <p className="text-xs font-semibold text-gray-800">
                      {event.action}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {event.actor} ·{" "}
                      {isClient && event.createdAt
                        ? new Date(event.createdAt).toLocaleString()
                        : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </WidgetCard>
        )}
      </div>
    </div>
  );
}
