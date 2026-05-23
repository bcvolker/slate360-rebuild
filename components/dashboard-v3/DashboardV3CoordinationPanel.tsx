import { DashboardV3EmptyState } from "./DashboardV3EmptyState";

export function DashboardV3CoordinationPanel({ alerts = [] }: { alerts: any[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-[#131820] p-6">
      <h3 className="mb-4 text-sm font-semibold text-white tracking-tight">Coordination</h3>
      <div className="flex items-center gap-5 border-b border-white/10 pb-4 mb-4">
        {['Alerts', 'Messages', 'Shared', 'Assigned', 'Access'].map((t, i) => (
          <span key={i} className={`cursor-pointer text-[11px] font-bold uppercase tracking-wider ${i===0 ? 'text-[#00E699]' : 'text-zinc-500 transition-colors hover:text-zinc-300'}`}>{t}</span>
        ))}
      </div>
      <div className="flex-1 min-h-[180px] flex flex-col justify-center">
        {alerts.length === 0 ? (
          <DashboardV3EmptyState 
            message="No active coordination items" 
            helperText="Messages, assignments, and access requests will appear here."
            actionText="Open Coordination"
          />
        ) : (
          <div className="space-y-2 h-full flex flex-col justify-start">
            {alerts.map((a, i) => (
              <div key={i} className="flex flex-col rounded-lg p-3 bg-white/[0.02] border border-white/5 text-sm hover:border-white/10 transition-colors">
                <span className="text-zinc-200 font-medium">{a.message || 'Alert'}</span>
                <span className="text-xs text-zinc-500 mt-1">System Notification</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
