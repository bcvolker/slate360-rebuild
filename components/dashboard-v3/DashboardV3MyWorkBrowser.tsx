import { DashboardV3EmptyState } from "./DashboardV3EmptyState";

export function DashboardV3MyWorkBrowser({ items = [] }: { items: any[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-white/[0.02] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">My Work</h3>
      <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-4">
        {['Recent', 'In Progress', 'Starred', 'Shared', 'Deliverables'].map((t, i) => (
          <span key={i} className={`text-xs font-medium cursor-pointer ${i===0 ? 'text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</span>
        ))}
      </div>
      <div className="flex-1 min-h-[150px]">
        {items.length === 0 ? (
          <DashboardV3EmptyState message="No items in this view" />
        ) : (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg p-2 hover:bg-white/5 cursor-pointer">
                <span className="text-sm text-zinc-300">{it.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
