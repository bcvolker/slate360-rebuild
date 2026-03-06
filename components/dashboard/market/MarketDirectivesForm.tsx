import React from "react";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import { FOCUS_AREAS } from "@/components/dashboard/market/market-constants";
import type { BuyDirective } from "@/components/dashboard/market/types";

type MarketDirectivesFormProps = {
  editingDirective: BuyDirective | null;
  directiveName: string;
  directiveAmount: number;
  directiveTimeframe: string;
  directiveBuysPerDay: number;
  directiveRisk: BuyDirective["risk_mix"];
  directiveWhale: boolean;
  directiveFocus: string[];
  directiveStrategy: BuyDirective["profit_strategy"];
  directivePaper: boolean;
  directiveDailyLossCap: number;
  directiveMoonshot: boolean;
  directiveTotalLossCap: number;
  directiveAutoPauseDays: number;
  directiveTargetProfitMonthly: number;
  directiveTakeProfitPct: number;
  directiveStopLossPct: number;
  formatMoney: (usd: number) => string;
  onDirectiveNameChange: (value: string) => void;
  onDirectiveAmountChange: (value: number) => void;
  onDirectiveTimeframeChange: (value: string) => void;
  onDirectiveBuysPerDayChange: (value: number) => void;
  onDirectiveRiskChange: (value: BuyDirective["risk_mix"]) => void;
  onDirectiveWhaleToggle: () => void;
  onDirectiveFocusToggle: (value: string) => void;
  onDirectiveStrategyChange: (value: BuyDirective["profit_strategy"]) => void;
  onDirectivePaperToggle: () => void;
  onDirectiveDailyLossCapChange: (value: number) => void;
  onDirectiveMoonshotToggle: () => void;
  onDirectiveTotalLossCapChange: (value: number) => void;
  onDirectiveAutoPauseDaysChange: (value: number) => void;
  onDirectiveTargetProfitMonthlyChange: (value: number) => void;
  onDirectiveTakeProfitPctChange: (value: number) => void;
  onDirectiveStopLossPctChange: (value: number) => void;
  onSaveDirective: () => void;
  onResetDirectiveForm: () => void;
};

export default function MarketDirectivesForm(props: MarketDirectivesFormProps) {
  const {
    editingDirective,
    directiveName,
    directiveAmount,
    directiveTimeframe,
    directiveBuysPerDay,
    directiveRisk,
    directiveWhale,
    directiveFocus,
    directiveStrategy,
    directivePaper,
    directiveDailyLossCap,
    directiveMoonshot,
    directiveTotalLossCap,
    directiveAutoPauseDays,
    directiveTargetProfitMonthly,
    directiveTakeProfitPct,
    directiveStopLossPct,
    formatMoney,
    onDirectiveNameChange,
    onDirectiveAmountChange,
    onDirectiveTimeframeChange,
    onDirectiveBuysPerDayChange,
    onDirectiveRiskChange,
    onDirectiveWhaleToggle,
    onDirectiveFocusToggle,
    onDirectiveStrategyChange,
    onDirectivePaperToggle,
    onDirectiveDailyLossCapChange,
    onDirectiveMoonshotToggle,
    onDirectiveTotalLossCapChange,
    onDirectiveAutoPauseDaysChange,
    onDirectiveTargetProfitMonthlyChange,
    onDirectiveTakeProfitPctChange,
    onDirectiveStopLossPctChange,
    onSaveDirective,
    onResetDirectiveForm,
  } = props;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">
        {editingDirective ? "Edit Directive" : "New Buy Directive"}
        <HelpTip content="Buy Directives are saved trading plans you can apply to the bot at any time." />
      </h3>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Directive Name</label>
        <input type="text" placeholder="e.g. Construction Arbitrage Q3" value={directiveName} onChange={(e) => onDirectiveNameChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#FF4D00]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">Amount ($)<HelpTip content="Total capital for this directive's session." /></label>
          <p className="text-[11px] text-gray-400 mb-1">Display value: {formatMoney(directiveAmount)}</p>
          <input type="number" min={10} max={10000} value={directiveAmount} onChange={(e) => onDirectiveAmountChange(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">Timeframe<HelpTip content="How long this directive runs before auto-stopping." /></label>
          <select value={directiveTimeframe} onChange={(e) => onDirectiveTimeframeChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
            {["1d", "3d", "1w", "2w", "1m"].map((timeframe) => <option key={timeframe} value={timeframe}>{timeframe}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">How Many Deals Per Day: {directiveBuysPerDay}<HelpTip content="This controls how fast the robot trades. 1 = slow and careful, higher = faster and busier." /></label>
        <input type="range" min={1} max={20} value={directiveBuysPerDay} onChange={(e) => onDirectiveBuysPerDayChange(Number(e.target.value))} className="w-full accent-[#FF4D00]" />
        <p className="text-[11px] text-amber-600 mt-1">Fee heads-up: high volume can cost roughly $10–$20/day per ~1,000 buys on Polygon.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Daily Loss Cap ($)</label>
          <input type="number" min={5} value={directiveDailyLossCap} onChange={(e) => onDirectiveDailyLossCapChange(Math.max(5, Number(e.target.value) || 40))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Target Profit This Month ($)</label>
          <input type="number" min={0} value={directiveTargetProfitMonthly} onChange={(e) => onDirectiveTargetProfitMonthlyChange(Math.max(0, Number(e.target.value) || 0))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Take Profit %</label>
          <input type="number" min={1} max={200} value={directiveTakeProfitPct} onChange={(e) => onDirectiveTakeProfitPctChange(Math.max(1, Number(e.target.value) || 20))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Stop Loss %</label>
          <input type="number" min={1} max={100} value={directiveStopLossPct} onChange={(e) => onDirectiveStopLossPctChange(Math.max(1, Number(e.target.value) || 10))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Auto-Pause Losing Days</label>
          <input type="number" min={1} max={10} value={directiveAutoPauseDays} onChange={(e) => onDirectiveAutoPauseDaysChange(Math.max(1, Number(e.target.value) || 3))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 flex items-center">Moonshot Mode<HelpTip content="Aggressive high-volume mode. Hard total loss cap and losing-day auto-pause still apply." /></span>
        <button onClick={onDirectiveMoonshotToggle} className={`relative w-10 h-5 rounded-full transition ${directiveMoonshot ? "bg-[#1E3A8A]" : "bg-gray-300"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${directiveMoonshot ? "translate-x-5" : "translate-x-0.5"}`} /></button>
      </div>
      {directiveMoonshot && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Moonshot Total Loss Cap ($)</label>
          <input type="number" min={50} value={directiveTotalLossCap} onChange={(e) => onDirectiveTotalLossCapChange(Math.max(50, Number(e.target.value) || 200))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]" />
        </div>
      )}

      <div>
        <label className="text-xs text-gray-500 mb-2 flex items-center">Risk Style (Safe / Balanced / Aggressive)<HelpTip content="Conservative = low risk/reward. Aggressive = high risk/reward." /></label>
        <div className="flex gap-1">{(["conservative", "balanced", "aggressive"] as const).map((risk) => <button key={risk} onClick={() => onDirectiveRiskChange(risk)} className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${directiveRisk === risk ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{risk === "conservative" ? "Safe" : risk === "balanced" ? "Balanced" : "Aggressive"}</button>)}</div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-2 flex items-center">Profit Strategy<HelpTip content="Arbitrage: exploit mispricing. Market-making: provide liquidity. Whale-copy: follow big players. Longshot: bet on unlikely outcomes with high payouts." /></label>
        <div className="grid grid-cols-2 gap-1">{(["arbitrage", "market-making", "whale-copy", "longshot"] as const).map((strategy) => <button key={strategy} onClick={() => onDirectiveStrategyChange(strategy)} className={`py-1.5 text-xs rounded-lg font-medium transition ${directiveStrategy === strategy ? "bg-[#1E3A8A] text-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{strategy.replace("-", " ").replace(/\b\w/g, (char) => char.toUpperCase())}</button>)}</div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-2 flex items-center">Focus Areas<HelpTip content="Market categories this directive targets." /></label>
        <div className="flex flex-wrap gap-1">{FOCUS_AREAS.map((area) => <button key={area} onClick={() => onDirectiveFocusToggle(area)} className={`px-2 py-0.5 text-xs rounded-full transition ${directiveFocus.includes(area) ? "bg-[#1E3A8A] text-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>{area}</button>)}</div>
      </div>

      <div className="flex items-center justify-between"><span className="text-sm text-gray-700 flex items-center">Follow Whales<HelpTip content="Mirror large trades in these markets." /></span><button onClick={onDirectiveWhaleToggle} className={`relative w-10 h-5 rounded-full transition ${directiveWhale ? "bg-[#1E3A8A]" : "bg-gray-300"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${directiveWhale ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>

      <div className="flex items-center justify-between"><span className="text-sm text-gray-700 flex items-center">Paper Mode<HelpTip content="Simulate this directive without spending real funds." /></span><button onClick={onDirectivePaperToggle} className={`relative w-10 h-5 rounded-full transition ${directivePaper ? "bg-purple-600" : "bg-gray-300"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${directivePaper ? "translate-x-5" : "translate-x-0.5"}`} /></button></div>

      <div className="flex gap-2 pt-1">
        <button onClick={onSaveDirective} disabled={!directiveName.trim()} className="flex-1 bg-[#FF4D00] hover:bg-orange-600 py-2 rounded-lg text-sm font-bold transition disabled:opacity-40">💾 Save Directive</button>
        {editingDirective && <button onClick={onResetDirectiveForm} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">Cancel</button>}
      </div>
    </div>
  );
}
