import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MarketListing } from "@/components/dashboard/market/types";
import { getMarketOpportunitySignal } from "@/lib/market/opportunity";

export function HelpTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] cursor-help ml-1 select-none">?</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-green-100 text-green-700 border border-green-200",
    closed: "bg-gray-200 text-gray-500",
    paper: "bg-purple-100 text-purple-700 border border-purple-200",
    connected: "bg-green-100 text-green-700 border border-green-200",
    disconnected: "bg-gray-200 text-gray-500",
    running: "bg-orange-100 text-orange-700 border border-orange-200",
    paused: "bg-amber-100 text-amber-700 border border-amber-200",
    stopped: "bg-gray-200 text-gray-500 border border-gray-300",
    conservative: "bg-blue-100 text-blue-700 border border-blue-200",
    balanced: "bg-amber-100 text-amber-700 border border-amber-200",
    aggressive: "bg-red-100 text-red-700 border border-red-200",
    idle: "bg-gray-200 text-gray-500",
    unknown: "bg-gray-200 text-gray-400 border border-gray-200",
  };

  const labels: Record<string, string> = {
    paper: "Practice",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${colors[status] || colors.idle}`}>
      {labels[status] ?? (status.charAt(0).toUpperCase() + status.slice(1))}
    </span>
  );
}

export function MarketOpportunityBadge({ market }: { market: MarketListing }) {
  const signal = getMarketOpportunitySignal(market);

  return (
    <span className={`inline-flex rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-sm ${signal.tone}`} title={signal.detail}>
      {signal.label}
    </span>
  );
}

export function MarketTableLegend() {
  return (
    <details className="rounded-xl border border-zinc-800 bg-zinc-950/80">
      <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200">
        Help: how to read market prices
      </summary>
      <div className="grid gap-2 px-4 pb-3 pt-1 sm:grid-cols-3 text-[11px] text-slate-400">
        <p><strong className="text-slate-200">Backing an outcome:</strong> Buy YES to profit if the event happens. Buy NO to profit if it doesn&apos;t.</p>
        <p><strong className="text-slate-200">Price:</strong> A 62c entry price means $0.62 per share, paying $1 if correct.</p>
        <p><strong className="text-slate-200">Market indicators:</strong> Value, activity, and depth are confidence cues, not guarantees.</p>
      </div>
    </details>
  );
}
