import { DashboardV3EmptyState } from "./DashboardV3EmptyState";

export function DashboardV3CoordinationPanel({ alerts = [] }: { alerts: any[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Coordination</h3>
      <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-4">
        {['Alerts', 'Messages', 'Shared', 'Assigned', 'Access'].map((t, i) => (
          <span key={i} className={`text-xs font-medium cursor-pointer ${i===0 ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</span>
        ))}
      </div>
      <div className="flex-1 min-h-[150px]">
        {alerts.length === 0 ? (
          <DashboardV3EmptyState message="No active coordination items" />
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex flex-col rounded-lg p-3 bg-white/5 border border-white/10 text-sm">
                <span className="text-zinc-200">{a.message || 'Alert'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
