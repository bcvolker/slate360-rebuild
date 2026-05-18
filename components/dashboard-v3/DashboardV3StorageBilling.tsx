import { DashboardV3EmptyState } from "./DashboardV3EmptyState";
import { HardDrive, Zap, CreditCard } from "lucide-react";

export function DashboardV3StorageBilling({ usage }: { usage: any }) {
  if (!usage) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-white/5 bg-[#131820] p-6">
        <h3 className="mb-4 text-sm font-semibold text-white tracking-tight">Storage & Billing</h3>
        <div className="flex-1">
          <DashboardV3EmptyState message="Usage data unavailable" actionText="Manage Billing" />
        </div>
      </div>
    );
  }

  const storageUsed = usage.storageGbUsed || 0;
  const storageLimit = usage.storageGbLimit || 10;
  const storagePct = Math.min(100, (Number(storageUsed) / storageLimit) * 100);

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-[#131820] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-white tracking-tight">Storage & Billing</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white cursor-pointer transition-colors">Manage</span>
      </div>
      
      <div className="flex-1 space-y-6">
        {/* Storage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <HardDrive className="h-3.5 w-3.5 text-blue-400" />
              Cloud Storage
            </div>
            <span className="text-white">{storageUsed} <span className="text-zinc-500">/ {storageLimit} GB</span></span>
          </div>
          <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${storagePct}%` }} />
          </div>
        </div>

        {/* Processing Credits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Processing Credits
            </div>
            <span className="text-zinc-500">Unavailable</span>
          </div>
          <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
             <div className="bg-zinc-700 h-1.5 rounded-full w-0" />
          </div>
        </div>

        {/* Subscription */}
        <div className="pt-2">
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white">Current Plan</span>
              <span className="text-[10px] text-zinc-500">Subscription data unavailable</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
