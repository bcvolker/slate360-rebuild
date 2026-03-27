"use client";

import WidgetCard from "@/components/widgets/WidgetCard";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import type { Tier } from "@/lib/entitlements";
import { User, CreditCard, Loader2 } from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

export interface AccountOverviewRowProps {
  user: { name: string; email: string };
  accountOverview: DashboardAccountOverview | null;
  accountLoading: boolean;
  storageUsed: number;
  entitlements: { maxStorageGB: number; label: string; tier: Tier };
  isAdmin: boolean;
  usageHealth: string;
  usageHealthClass: string;
  profileCompletion: number;
  onApplyPreset: (preset: "simple" | "creator" | "project") => void;
  onOpenBillingPortal: () => void;
  onBuyCredits: () => void;
  onUpgradePlan: () => void;
  onBackToOverview: () => void;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function AccountOverviewRow({
  user,
  accountOverview,
  accountLoading,
  storageUsed,
  entitlements: ent,
  isAdmin,
  usageHealth,
  usageHealthClass,
  onApplyPreset,
  onOpenBillingPortal,
  onBuyCredits,
  onUpgradePlan,
  onBackToOverview,
}: AccountOverviewRowProps) {
  return (
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
  );
}
