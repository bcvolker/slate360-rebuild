import { DashboardV3EmptyState } from "./DashboardV3EmptyState";

export function DashboardV3MyWorkBrowser({ items = [] }: { items: any[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-[#131820] p-6">
      <h3 className="mb-4 text-sm font-semibold text-white tracking-tight">My Work</h3>
      <div className="flex items-center gap-5 border-b border-white/10 pb-4 mb-4">
        {['Recent', 'In Progress', 'Starred', 'Shared', 'Deliverables'].map((t, i) => (
          <span key={i} className={`text-[11px] font-bold uppercase tracking-wider cursor-pointer ${i===0 ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300 transition-colors'}`}>{t}</span>
        ))}
      </div>
      <div className="flex-1 min-h-[180px] flex flex-col justify-center">
        {items.length === 0 ? (
          <DashboardV3EmptyState 
            message="No recent work yet" 
            helperText="Projects, deliverables, shared files, and app activity will appear here." 
            actionText="Create New"
          />
        ) : (
          <div className="space-y-2 h-full flex flex-col justify-start">
            {items.map((it, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg p-3 hover:bg-white/[0.03] transition-colors cursor-pointer border border-transparent hover:border-white/5">
                <span className="text-sm font-medium text-zinc-300">{it.name}</span>
                <span className="text-xs text-zinc-500">Just now</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
