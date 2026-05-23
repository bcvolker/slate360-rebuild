"use client";

import { CreditCard, Loader2 } from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/lib/widgets/widget-meta";

type Props = {
  span: string;
  widgetColor: string;
  widgetSize: WidgetSize;
  onSetSize?: (size: WidgetSize) => void;
  tierLabel: string;
  creditsUsed: number;
  maxCredits: number;
  storageUsed: number;
  maxStorageGB: number;
  billingBusy: "portal" | "credits" | "upgrade" | null;
  billingError: string | null;
  onBuyCredits: () => void;
  onUpgradePlan: () => void;
};

export default function DashboardDataUsageWidget({
  span,
  widgetColor,
  widgetSize,
  onSetSize,
  tierLabel,
  creditsUsed,
  maxCredits,
  storageUsed,
  maxStorageGB,
  billingBusy,
  billingError,
  onBuyCredits,
  onUpgradePlan,
}: Props) {
  return (
    <WidgetCard
      icon={CreditCard}
      title="Data Usage & Credits"
      span={span}
      delay={0}
      color={widgetColor}
      onSetSize={onSetSize}
      size={widgetSize}
      action={
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ backgroundColor: "#3B82F61A", color: "#3B82F6" }}
        >
          {tierLabel}
        </span>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Credits used</span>
            <span className="text-xs font-bold text-gray-900">
              {creditsUsed.toLocaleString()} / {maxCredits.toLocaleString()}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min((creditsUsed / maxCredits) * 100, 100)}%`, backgroundColor: "#3B82F6" }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {(maxCredits - creditsUsed).toLocaleString()} credits remaining this period
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Storage</span>
            <span className="text-xs font-bold text-gray-900">
              {storageUsed} GB / {maxStorageGB} GB
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#3B82F6] transition-all duration-1000 ease-out"
              style={{ width: `${Math.min((storageUsed / maxStorageGB) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={onBuyCredits}
            disabled={billingBusy !== null}
            className="flex-1 text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {billingBusy === "credits" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </span>
            ) : (
              "Buy credits"
            )}
          </button>
          <button
            onClick={onUpgradePlan}
            disabled={billingBusy !== null}
            className="flex-1 text-xs font-semibold py-2 rounded-lg text-foreground transition-all hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#3B82F6" }}
          >
            {billingBusy === "upgrade" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </span>
            ) : (
              "Upgrade plan"
            )}
          </button>
        </div>

        {billingError && <p className="text-[11px] text-red-500">{billingError}</p>}
      </div>
    </WidgetCard>
  );
}
