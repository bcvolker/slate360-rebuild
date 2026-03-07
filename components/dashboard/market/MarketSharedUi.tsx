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

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.idle}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function MarketOpportunityBadge({ market }: { market: MarketListing }) {
  const signal = getMarketOpportunitySignal(market);

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${signal.tone}`} title={signal.detail}>
      {signal.label}
    </span>
  );
}

export function MarketTableLegend() {
  return (
    <div className="rounded-2xl border border-[#1E3A8A]/10 bg-gradient-to-br from-[#1E3A8A]/[0.04] via-white to-[#FF4D00]/[0.05] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold text-gray-900">How to read this table</p>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 ring-1 ring-gray-200">
          Click Market, Prob, Edge, Volume, or Ends to sort
        </span>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 text-xs text-gray-600">
          <p><span className="font-semibold text-green-700">YES¢</span> is the current cost per YES share. <span className="font-semibold text-red-700">NO¢</span> is the current cost per NO share.</p>
          <p><span className="font-semibold text-gray-900">Prob</span> is the market-implied chance of YES resolving true. <span className="font-semibold text-[#FF4D00]">Edge</span> is the estimated pricing advantage over fair value.</p>
          <p><span className="font-semibold text-gray-900">Volume</span> and liquidity help you judge execution quality. Higher numbers usually mean easier fills and less slippage. Click a header again to reverse the sort.</p>
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          <p><span className="font-semibold text-gray-900">Premium</span> and <span className="font-semibold text-gray-900">Strong</span> signals combine edge, spread, liquidity, and activity. They are quality cues, not guaranteed profits.</p>
          <p>Green and orange tones indicate stronger execution conditions. Gray and rose tags flag markets where sizing and patience matter more because fills or conviction are weaker.</p>
          <p><span className="font-semibold text-gray-900">Ends</span> shows when the market resolves so newer users can avoid accidentally buying contracts that settle too soon.</p>
        </div>
      </div>
    </div>
  );
}
