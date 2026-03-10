"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useMarketAutomationState } from "@/lib/hooks/useMarketAutomationState";
import MarketAutomationBuilder from "@/components/dashboard/market/MarketAutomationBuilder";
import MarketPlanList from "@/components/dashboard/market/MarketPlanList";
import type { AutomationPlan, BotConfig } from "@/components/dashboard/market/types";

interface MarketAutomationTabProps {
  botConfig: BotConfig;
  onApplyPlan: (plan: AutomationPlan) => void;
  onStopBot?: () => void;
  onNavigate?: (tabId: string) => void;
}

export default function MarketAutomationTab({ botConfig, onApplyPlan, onStopBot, onNavigate }: MarketAutomationTabProps) {
  const auto = useMarketAutomationState();
  const [composerOpen, setComposerOpen] = useState(false);

  const handleApply = useCallback((plan: AutomationPlan) => {
    onApplyPlan(plan);
  }, [onApplyPlan]);

  const handleSave = useCallback(async () => {
    const saved = await auto.savePlan();
    if (saved) {
      setComposerOpen(false);
    }
  }, [auto]);

  const quickStats = useMemo(() => ({
    practicePlans: auto.plans.filter((plan) => !plan.isArchived && plan.mode === "practice").length,
    realPlans: auto.plans.filter((plan) => !plan.isArchived && plan.mode === "real").length,
  }), [auto.plans]);

  return (
    <div className="space-y-5">
      {/* Active plan summary */}
      <ActivePlanSummary botConfig={botConfig} defaultPlan={auto.plans.find(p => p.isDefault)} onStop={onStopBot} onGoLive={onNavigate ? () => onNavigate("live-wallet") : undefined} />

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Automation Plans</h3>
          <p className="text-xs text-gray-500 mt-1">
            Save a simple plan, apply it, and let the robot run. Practice plans: {quickStats.practicePlans} · Live plans: {quickStats.realPlans}
          </p>
        </div>
        <button
          onClick={() => setComposerOpen((value) => !value)}
          className="px-4 py-2 rounded-lg bg-[#FF4D00] text-white text-sm font-semibold hover:bg-[#e04400] transition"
        >
          {composerOpen || auto.editingId ? "Close plan builder" : "New plan"}
        </button>
      </div>

      {/* Plan builder + list */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {(composerOpen || auto.editingId) && (
          <MarketAutomationBuilder
            draft={auto.draft}
            editingId={auto.editingId}
            controlLevel={auto.controlLevel}
            onControlLevelChange={auto.setControlLevel}
            onFieldChange={auto.setDraftField}
            onSave={handleSave}
            onReset={() => {
              auto.resetDraft();
              setComposerOpen(false);
            }}
          />
        )}

        <MarketPlanList
          plans={auto.plans}
          onEdit={(id) => {
            auto.startEdit(id);
            setComposerOpen(true);
          }}
          onClone={auto.clonePlan}
          onRename={auto.renamePlan}
          onArchive={auto.archivePlan}
          onSetDefault={auto.setDefaultPlan}
          onDelete={auto.deletePlan}
          onApply={handleApply}
        />
      </div>
    </div>
  );
}

function ActivePlanSummary({
  botConfig,
  defaultPlan,
  onStop,
  onGoLive,
}: {
  botConfig: BotConfig;
  defaultPlan?: AutomationPlan;
  onStop?: () => void;
  onGoLive?: () => void;
}) {
  const isRunning = botConfig.botRunning && !botConfig.botPaused;
  const isPaper = botConfig.paperMode;

  return (
    <div className={`rounded-2xl border p-4 ${
      isRunning
        ? isPaper
          ? "bg-purple-50 border-purple-200"
          : "bg-orange-50 border-orange-200"
        : "bg-gray-50 border-gray-200"
    }`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          {isRunning ? "🟢 Robot Running" : "⏸️ Robot Idle"}
          {isPaper && (
            <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">
              Practice — no real money
            </span>
          )}
          {isRunning && !isPaper && (
            <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full">
              Live trading
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {isRunning && !isPaper && onGoLive && (
            <button
              onClick={onGoLive}
              className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 font-medium transition"
            >
              Wallet setup →
            </button>
          )}
          {isRunning && onStop && (
            <button
              onClick={onStop}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-medium transition"
            >
              ⏹ Stop Robot
            </button>
          )}
        </div>
      </div>
      {defaultPlan && (
        <p className="text-xs text-gray-500 mb-2">Active plan: <strong>{defaultPlan.name}</strong></p>
      )}
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
