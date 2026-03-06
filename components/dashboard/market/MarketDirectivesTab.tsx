import React from "react";
import MarketDirectivesForm from "@/components/dashboard/market/MarketDirectivesForm";
import MarketDirectivesList from "@/components/dashboard/market/MarketDirectivesList";
import type { BuyDirective } from "@/components/dashboard/market/types";

type MarketDirectivesTabProps = {
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
  directives: BuyDirective[];
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
  onApplyDirective: (directive: BuyDirective) => void;
  onStartEditDirective: (directive: BuyDirective) => void;
  onDeleteDirective: (id: string) => void;
};

export default function MarketDirectivesTab({
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
  directives,
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
  onApplyDirective,
  onStartEditDirective,
  onDeleteDirective,
}: MarketDirectivesTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <MarketDirectivesForm
        editingDirective={editingDirective}
        directiveName={directiveName}
        directiveAmount={directiveAmount}
        directiveTimeframe={directiveTimeframe}
        directiveBuysPerDay={directiveBuysPerDay}
        directiveRisk={directiveRisk}
        directiveWhale={directiveWhale}
        directiveFocus={directiveFocus}
        directiveStrategy={directiveStrategy}
        directivePaper={directivePaper}
        directiveDailyLossCap={directiveDailyLossCap}
        directiveMoonshot={directiveMoonshot}
        directiveTotalLossCap={directiveTotalLossCap}
        directiveAutoPauseDays={directiveAutoPauseDays}
        directiveTargetProfitMonthly={directiveTargetProfitMonthly}
        directiveTakeProfitPct={directiveTakeProfitPct}
        directiveStopLossPct={directiveStopLossPct}
        formatMoney={formatMoney}
        onDirectiveNameChange={onDirectiveNameChange}
        onDirectiveAmountChange={onDirectiveAmountChange}
        onDirectiveTimeframeChange={onDirectiveTimeframeChange}
        onDirectiveBuysPerDayChange={onDirectiveBuysPerDayChange}
        onDirectiveRiskChange={onDirectiveRiskChange}
        onDirectiveWhaleToggle={onDirectiveWhaleToggle}
        onDirectiveFocusToggle={onDirectiveFocusToggle}
        onDirectiveStrategyChange={onDirectiveStrategyChange}
        onDirectivePaperToggle={onDirectivePaperToggle}
        onDirectiveDailyLossCapChange={onDirectiveDailyLossCapChange}
        onDirectiveMoonshotToggle={onDirectiveMoonshotToggle}
        onDirectiveTotalLossCapChange={onDirectiveTotalLossCapChange}
        onDirectiveAutoPauseDaysChange={onDirectiveAutoPauseDaysChange}
        onDirectiveTargetProfitMonthlyChange={onDirectiveTargetProfitMonthlyChange}
        onDirectiveTakeProfitPctChange={onDirectiveTakeProfitPctChange}
        onDirectiveStopLossPctChange={onDirectiveStopLossPctChange}
        onSaveDirective={onSaveDirective}
        onResetDirectiveForm={onResetDirectiveForm}
      />

      <MarketDirectivesList
        directives={directives}
        formatMoney={formatMoney}
        onApplyDirective={onApplyDirective}
        onStartEditDirective={onStartEditDirective}
        onDeleteDirective={onDeleteDirective}
      />
    </div>
  );
}
