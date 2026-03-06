import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import type { BuyDirective } from "@/components/dashboard/market/types";

type MarketDirectivesListProps = {
  directives: BuyDirective[];
  formatMoney: (usd: number) => string;
  onApplyDirective: (directive: BuyDirective) => void;
  onStartEditDirective: (directive: BuyDirective) => void;
  onDeleteDirective: (id: string) => void;
};

export default function MarketDirectivesList({
  directives,
  formatMoney,
  onApplyDirective,
  onStartEditDirective,
  onDeleteDirective,
}: MarketDirectivesListProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-700">Saved Directives ({directives.length})</h3>
      {directives.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-center text-gray-400 text-sm">
          No saved directives yet. Create one on the left.
        </div>
      ) : (
        directives.map((directive) => (
          <div key={directive.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">{directive.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatMoney(directive.amount)} · {directive.timeframe} · {directive.buys_per_day}/day · {directive.profit_strategy}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Daily cap ${directive.daily_loss_cap ?? 40} · TP {directive.take_profit_pct ?? 20}% · SL {directive.stop_loss_pct ?? 10}%
                  {directive.moonshot_mode ? ` · Moonshot cap $${directive.total_loss_cap ?? 200}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                {directive.paper_mode && (
                  <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">
                    Paper
                  </span>
                )}
                <StatusBadge status={directive.risk_mix} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {directive.focus_areas.map((focusArea) => (
                <span key={focusArea} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {focusArea}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onApplyDirective(directive)}
                    className="flex-1 bg-[#FF4D00] hover:bg-orange-600 text-white text-xs py-1.5 rounded-lg font-medium transition"
                  >
                    ▶ Apply to Bot
                  </button>
                </TooltipTrigger>
                <TooltipContent>Load this directive&apos;s settings into the bot and switch to Dashboard.</TooltipContent>
              </Tooltip>
              <button
                onClick={() => onStartEditDirective(directive)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => directive.id && onDeleteDirective(directive.id)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs rounded-lg transition"
              >
                🗑
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
