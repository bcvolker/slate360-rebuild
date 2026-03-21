"use client";

import React from "react";
import { useMarketAutomationState } from "@/lib/hooks/useMarketAutomationState";
import MarketAutomationBuilder from "@/components/dashboard/market/MarketAutomationBuilder";
import MarketPlanList from "@/components/dashboard/market/MarketPlanList";
import type { AutomationPlan } from "@/components/dashboard/market/types";
/**
 * MarketAutomationTab - Build, save, edit, and run automation plans.
 * Owns automation builder, saved plans list, current automation state.
 * Updated to accept required props from MarketClient.tsx.
 */

interface MarketAutomationTabProps {
  onNavigate: (tabId: string) => void;
  paperMode: boolean;
  onQuickStart?: () => void;
  onStopBot?: () => void;
  activePlan?: unknown;
  onApplyPlan?: (plan: unknown) => void;
  onDeletePlan?: (planId: string) => void;
}

export default function MarketAutomationTab({
  onNavigate,
  paperMode,
  onApplyPlan
}: MarketAutomationTabProps) {
  const automation = useMarketAutomationState();
  const modeLabel = paperMode ? "Practice Mode" : "Live Mode";
  const modeColor = paperMode ? "bg-green-600" : "bg-amber-600";

  const handleSaveAndApply = async () => {
    const result = await automation.savePlan();
    if (result && result.plan && onApplyPlan) {
      onApplyPlan(result.plan);
    }
  };
  return (
    <div className="automation-tab bg-zinc-950 text-slate-200 p-6 max-w-full overflow-hidden">
      <div className="header mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Automation</h1>
        <p className="text-base text-slate-300">Create rules to trade automatically. Save multiple plans and switch between them.</p>
        <div className="mode-indicator flex items-center gap-2 mt-2">
          <span className={`w-3 h-3 rounded-full ${modeColor}`}></span>
          <span className="text-sm text-slate-400">{modeLabel}</span>
        </div>
      </div>

      <div className="panels flex flex-col lg:flex-row gap-6">
        <div className="builder-panel lg:w-1/2 bg-zinc-900 rounded-2xl p-4 min-h-[300px]">
          <MarketAutomationBuilder
            draft={automation.draft}
            editingId={automation.editingId}
            controlLevel={automation.controlLevel}
            onControlLevelChange={automation.setControlLevel}
            onFieldChange={automation.setDraftField}
            onSave={automation.savePlan}
            onSaveAndApply={handleSaveAndApply}
            onReset={automation.resetDraft}
          />
        </div>
        <div className="plans-panel lg:w-1/2 bg-zinc-900 rounded-2xl p-4 min-h-[300px]">
          {automation.plans.length === 0 ? (
            <div className="empty-state flex items-center justify-center h-full text-slate-400">
              <p>No saved plans yet — create one above</p>
            </div>
          ) : (
            <MarketPlanList
              plans={automation.plans}
              onEdit={automation.startEdit}
              onClone={automation.clonePlan}
              onRename={automation.renamePlan}
              onArchive={automation.archivePlan}
              onSetDefault={automation.setDefaultPlan}
              onDelete={automation.deletePlan}
              onApply={(plan: AutomationPlan) => onApplyPlan && onApplyPlan(plan)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

