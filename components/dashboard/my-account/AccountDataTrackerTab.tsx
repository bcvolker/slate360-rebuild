"use client";

import { Loader2, Zap, HardDrive, FolderOpen, Box, Compass, FileText, AlertTriangle, ArrowRight } from "lucide-react";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";

interface Props {
  overview: DashboardAccountOverview | null;
  isAdmin: boolean;
  isCeo: boolean;
  maxCredits: number;
  maxStorageGB: number;
  tierLabel: string;
  loading: boolean;
  onBuyCredits: () => void;
}

function UsageBar({ used, max, label, icon: Icon, unit, warning }: {
  used: number; max: number; label: string; icon: React.ElementType; unit: string; warning?: boolean;
}) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const isHigh = pct >= 80;
  const isCritical = pct >= 95;
  const showWarning = warning ?? isHigh;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Icon size={14} className="text-[#3B82F6]" /> {label}
        </span>
        <span className={`text-xs font-bold ${isCritical ? "text-red-400" : isHigh ? "text-amber-400" : "text-zinc-400"}`}>
          {used.toLocaleString()} / {max.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isCritical ? "bg-red-500" : isHigh ? "bg-amber-500" : "bg-[#3B82F6]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showWarning && (
        <p className={`text-[10px] flex items-center gap-1 ${isCritical ? "text-red-400" : "text-amber-400"}`}>
          <AlertTriangle size={10} />
          {isCritical ? "Critical: You're almost at your limit. Purchase more to continue." : "Running low — consider purchasing more."}
        </p>
      )}
    </div>
  );
}

export default function AccountDataTrackerTab({ overview, isAdmin, isCeo, maxCredits, maxStorageGB, tierLabel, loading, onBuyCredits }: Props) {
  const usage = overview?.usage;
  const billing = overview?.billing;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[#3B82F6]" size={24} />
      </div>
    );
  }

  const storageUsed = usage?.storageUsedGb ?? 0;

  return (
    <div className="space-y-6">
      {/* Credits & Storage Meters */}
      <div className="rounded-2xl border border-app bg-app-card p-6 space-y-5">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <Zap size={16} className="text-[#3B82F6]" /> Usage Overview
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#3B82F6]">
            {tierLabel}
          </span>
        </h3>

        <UsageBar
          used={storageUsed}
          max={maxStorageGB}
          label="Storage"
          icon={HardDrive}
          unit="GB"
          warning={isCeo ? false : undefined}
        />
      </div>

      {isCeo && (
        <div className="rounded-2xl border border-[#3B82F6]/30 bg-[#3B82F6]/5 p-4 text-center">
          <p className="text-xs text-zinc-400">
            Internal owner usage is shown for visibility only. Version 1 launch flows should not be blocked by normal storage or credit purchase prompts.
          </p>
        </div>
      )}

      {/* Asset Breakdown */}
      <div className="rounded-2xl border border-app bg-app-card p-6">
        <h3 className="text-sm font-bold text-zinc-100 mb-4">Asset Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Projects", value: usage?.projectsCount ?? 0, icon: FolderOpen },
            { label: "Files", value: usage?.fileCount ?? 0, icon: FileText },
            { label: "3D Models", value: usage?.modelsCount ?? 0, icon: Box },
            { label: "Images", value: usage?.toursCount ?? 0, icon: Compass },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/[0.04] p-3 text-center">
              <item.icon size={18} className="text-[#3B82F6] mx-auto mb-1.5" />
              <p className="text-lg font-black text-zinc-100">{item.value}</p>
              <p className="text-[10px] text-zinc-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Balance Detail */}
      <div className="rounded-2xl border border-app bg-app-card p-6">
        <h3 className="text-sm font-bold text-zinc-100 mb-3">Credit Balance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Plan Allocation</p>
            <p className="text-lg font-bold text-zinc-100">{maxCredits.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Purchased Credits</p>
            <p className="text-lg font-bold text-zinc-100">{(billing?.purchasedCredits ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Balance</p>
            <p className="text-lg font-bold text-[#3B82F6]">{(billing?.totalCreditsBalance ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Included Monthly Credits</p>
            <p className="text-lg font-bold text-zinc-100">{maxCredits.toLocaleString()}</p>
          </div>
        </div>

        {/* Buy More Credits CTA */}
        {isAdmin && !isCeo && (
          <button
            onClick={onBuyCredits}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-[#3B82F6]/80 transition-colors"
          >
            <Zap size={14} /> Buy More Credits <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Non-admin notice */}
      {!isAdmin && (
        <div className="rounded-2xl border border-app bg-app-card/50 p-4 text-center">
          <p className="text-xs text-zinc-500">
            Credit purchases and storage upgrades are managed by your organization&apos;s administrator.
            {" "}Contact them if you need additional capacity.
          </p>
        </div>
      )}
    </div>
  );
}
