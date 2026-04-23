"use client";

import WidgetCard from "@/components/widgets/WidgetCard";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import type { Tier } from "@/lib/entitlements";
import { User, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  onApplyPreset: (preset: "simple" | "creative" | "fieldwork") => void;
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Name
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {accountOverview?.profile.name ?? user.name}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Email
                </p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {accountOverview?.profile.email ?? user.email}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Organization
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {accountOverview?.profile.orgName ?? "Slate360 Organization"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Role
                </p>
                <p className="text-sm font-semibold text-foreground capitalize">
                  {accountOverview?.profile.role ?? "member"}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Storage Health
                </p>
                <p className="text-sm font-semibold text-foreground">
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
                className="px-3 py-1.5 rounded-lg border border-app text-xs font-semibold text-zinc-400 hover:bg-white/[0.04] transition-colors"
              >
                Simple View
              </button>
              <button
                onClick={() => onApplyPreset("creative")}
                className="px-3 py-1.5 rounded-lg border border-app text-xs font-semibold text-zinc-400 hover:bg-white/[0.04] transition-colors"
              >
                Creative View
              </button>
              <button
                onClick={() => onApplyPreset("fieldwork")}
                className="px-3 py-1.5 rounded-lg border border-app text-xs font-semibold text-zinc-400 hover:bg-white/[0.04] transition-colors"
              >
                Fieldwork View
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
            className="text-[11px] font-semibold text-[#3B82F6] hover:underline"
          >
            {isAdmin ? "Manage Billing" : "View Billing"}
          </button>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Current Plan
            </p>
            <p className="text-sm font-semibold text-foreground">
              {accountOverview?.billing.plan ?? ent.label}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Status
            </p>
            <p className="text-sm font-semibold text-foreground capitalize">
              {accountOverview?.billing.status ?? "active"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Renewal
            </p>
            <p className="text-sm font-semibold text-foreground">
              {accountOverview?.billing.renewsOn
                ? new Date(accountOverview.billing.renewsOn).toLocaleDateString()
                : "Not available"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Seats
            </p>
            <p className="text-sm font-semibold text-foreground">
              {isAdmin
                ? "4 used / 10 included"
                : "Managed by your organization"}
            </p>
          </div>
          {isAdmin && (
            <div className="p-3 rounded-xl bg-white/[0.04]/50 border border-app/50">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Plan Preview
              </p>
              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Starter</span>
                  <span className="font-semibold text-zinc-300">
                    Basic access
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pro</span>
                  <span className="font-semibold text-zinc-300">
                    Advanced tools
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Enterprise</span>
                  <span className="font-semibold text-zinc-300">
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
                className="text-xs font-semibold py-2 rounded-lg border border-app text-zinc-400 hover:bg-white/[0.04] transition-colors"
              >
                Buy Credits
              </button>
              <button
                onClick={onUpgradePlan}
                className="text-xs font-semibold py-2 rounded-lg text-foreground hover:opacity-90 transition-all"
                style={{ backgroundColor: "#3B82F6" }}
              >
                Upgrade
              </button>
              <button
                onClick={onBackToOverview}
                className="text-xs font-semibold py-2 rounded-lg border border-app text-zinc-400 hover:bg-white/[0.04] transition-colors"
              >
                Manage Seats
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500">
              Read-only plan details. Billing controls are available for
              owner/admin roles.
            </p>
          )}
        </div>
      </WidgetCard>
    </div>
  );
}
