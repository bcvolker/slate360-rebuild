import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MarketListing } from "@/components/dashboard/market/types";
import { getMarketOpportunitySignal } from "@/lib/market/opportunity";

export function HelpTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 text-gray-700 text-[10px] cursor-help ml-1 select-none">?</span>
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
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.idle}`}>
      {labels[status] ?? (status.charAt(0).toUpperCase() + status.slice(1))}
    </span>
  );
}

export function MarketOpportunityBadge({ market }: { market: MarketListing }) {
  const signal = getMarketOpportunitySignal(market);

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-sm ${signal.tone}`} title={signal.detail}>
      {signal.label}
    </span>
  );
}

export function MarketTableLegend() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,122,26,0.12),rgba(255,255,255,0.88))] p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-black text-slate-900">Quick guide</p>
        <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Built for first-time Polymarket users
        </span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-900">Backing an outcome</p>
          <p className="mt-2 leading-6">Buying <span className="font-semibold text-emerald-700">This happens</span> means you profit if the event resolves YES. Buying <span className="font-semibold text-rose-700">This does not happen</span> means you profit if it resolves NO.</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-900">Reading the price</p>
          <p className="mt-2 leading-6">A 62c entry price means one share costs $0.62 today and pays out $1 if your side is correct. The implied chance shows what the market currently believes.</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-900">Quality signals</p>
          <p className="mt-2 leading-6">Pricing edge, signal quality, volume, and liquidity help you judge how tradable a market is. They are confidence cues, not guarantees.</p>
        </div>
      </div>
    </div>
  );
}
