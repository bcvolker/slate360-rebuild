"use client";

import React, { useCallback } from "react";
import { useMarketAutomationState } from "@/lib/hooks/useMarketAutomationState";
import MarketAutomationBuilder from "@/components/dashboard/market/MarketAutomationBuilder";
import MarketPlanList from "@/components/dashboard/market/MarketPlanList";
import type { AutomationPlan, BotConfig } from "@/components/dashboard/market/types";

interface MarketAutomationTabProps {
  botConfig: BotConfig;
  onApplyPlan: (plan: AutomationPlan) => void;
}

export default function MarketAutomationTab({ botConfig, onApplyPlan }: MarketAutomationTabProps) {
  const auto = useMarketAutomationState();

  const handleApply = useCallback((plan: AutomationPlan) => {
    onApplyPlan(plan);
  }, [onApplyPlan]);

  return (
    <div className="space-y-5">
      {/* Active plan summary */}
      <ActivePlanSummary botConfig={botConfig} defaultPlan={auto.plans.find(p => p.isDefault)} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MarketAutomationBuilder
          draft={auto.draft}
          editingId={auto.editingId}
          controlLevel={auto.controlLevel}
          onControlLevelChange={auto.setControlLevel}
          onFieldChange={auto.setDraftField}
          onSave={auto.savePlan}
          onReset={auto.resetDraft}
        />

        <MarketPlanList
          plans={auto.plans}
          onEdit={auto.startEdit}
          onClone={auto.clonePlan}
          onRename={auto.renamePlan}
          onArchive={auto.archivePlan}
          onSetDefault={auto.setDefaultPlan}
          onDelete={auto.deletePlan}
          onApply={handleApply}
        />
      </div>

      {/* Backward compatibility note */}
      <div className="text-[11px] text-gray-400 text-center pt-2">
        Plans now load from Supabase <code className="text-gray-500">market_plans</code> with local fallback,
        but execution still syncs through <code className="text-gray-500">/api/market/directives</code> until the scheduler is migrated.
      </div>
    </div>
  );
}

function ActivePlanSummary({ botConfig, defaultPlan }: { botConfig: BotConfig; defaultPlan?: AutomationPlan }) {
  const isRunning = botConfig.botRunning && !botConfig.botPaused;

  return (
    <div className={`rounded-2xl border p-4 ${isRunning ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          {isRunning ? "🟢 Robot Running" : "⏸️ Robot Idle"}
          {botConfig.paperMode && (
            <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">Practice</span>
          )}
        </h3>
        {defaultPlan && (
          <span className="text-xs text-gray-500">Default: {defaultPlan.name}</span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Budget</p>
          <p className="text-sm font-bold text-gray-900">${botConfig.capitalAlloc}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Trades / Day</p>
          <p className="text-sm font-bold text-gray-900">{botConfig.maxTradesPerDay}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Risk</p>
          <p className="text-sm font-bold text-gray-900 capitalize">{botConfig.riskMix}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Max Positions</p>
          <p className="text-sm font-bold text-gray-900">{botConfig.maxPositions}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Last Scan</p>
          <p className="text-sm font-bold text-gray-900">
            {botConfig.lastScan ? new Date(botConfig.lastScan).toLocaleTimeString() : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
