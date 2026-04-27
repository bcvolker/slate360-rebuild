import { Cloud, RefreshCcw } from "lucide-react";

export function SyncQueueIndicator() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900" aria-label="Sync queue status">
      <Cloud className="h-4 w-4" />
      <span>Online scaffold</span>
      <span className="h-1 w-1 rounded-full bg-emerald-700" aria-hidden />
      <RefreshCcw className="h-4 w-4" />
      <span>0 pending</span>
    </div>
  );
}
