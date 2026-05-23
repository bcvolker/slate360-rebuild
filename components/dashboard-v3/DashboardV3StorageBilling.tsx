import { DashboardV3EmptyState } from "./DashboardV3EmptyState";
import { HardDrive, Zap, CreditCard } from "lucide-react";

export function DashboardV3StorageBilling({ usage }: { usage: any }) {
  if (!usage) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-white/5 bg-[#131820] p-6 relative overflow-hidden">
        <h3 className="mb-4 text-sm font-semibold text-white tracking-tight">Storage & Billing</h3>
        <div className="flex-1 min-h-[140px] flex flex-col justify-center">
          <DashboardV3EmptyState message="Usage data unavailable" actionText="Manage Billing" />
        </div>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((parseFloat(usage.storageGbUsed) / usage.storageGbLimit) * 100)) || 0;

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-[#131820] p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <HardDrive className="h-24 w-24" />
      </div>

      <h3 className="mb-4 text-sm font-semibold text-white tracking-tight relative z-10">Storage & Billing</h3>
      
      <div className="flex-1 flex flex-col justify-between relative z-10">
        <div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-black text-white">{usage.storageGbUsed}</span>
            <span className="text-sm font-medium text-zinc-400 mb-1">/ {usage.storageGbLimit} GB</span>
          </div>
          <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase">Total Volume Used</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-400">Current Plan</span>
              <span className="flex items-center gap-1 text-[#00E699]"><Zap className="h-3 w-3" /> Pro Tier</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-xl bg-white/5">
              <div className="h-full rounded-xl bg-[#00E699]" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-[10px] text-zinc-500 font-medium">{percent}% of limit</p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors">
              <CreditCard className="h-3.5 w-3.5" /> Manage Billing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
