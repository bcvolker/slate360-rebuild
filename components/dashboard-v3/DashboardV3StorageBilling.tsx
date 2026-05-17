import { DashboardV3EmptyState } from "./DashboardV3EmptyState";

export function DashboardV3StorageBilling({ usage }: { usage: any }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Storage & Billing</h3>
      <div className="flex-1 flex flex-col justify-center">
        {!usage ? (
          <DashboardV3EmptyState message="Usage data unavailable" actionText="Manage Billing" />
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>Storage</span>
                <span>{usage.storageGbUsed || 0} / {usage.storageGbLimit || 10} GB</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{width: '10%'}}/></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
