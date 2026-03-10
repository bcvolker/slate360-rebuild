"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useMarketAutomationState } from "@/lib/hooks/useMarketAutomationState";
import MarketAutomationBuilder from "@/components/dashboard/market/MarketAutomationBuilder";
import MarketPlanList from "@/components/dashboard/market/MarketPlanList";
import type { AutomationPlan, BotConfig } from "@/components/dashboard/market/types";
import type { SchedulerHealthViewModel } from "@/lib/market/contracts";
import type { ServerBotStatus } from "@/lib/hooks/useMarketServerStatus";

interface MarketAutomationTabProps {
  botConfig: BotConfig;
  onApplyPlan: (plan: AutomationPlan) => void;
  onRunNow: () => void;
  onStopBot: () => void;
  serverStatus: ServerBotStatus;
  serverHealth: SchedulerHealthViewModel | null;
  scanLog: string[];
}

export default function MarketAutomationTab({ botConfig, onApplyPlan, onRunNow, onStopBot, serverStatus, serverHealth, scanLog }: MarketAutomationTabProps) {
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

  const handleSaveAndApply = useCallback(async () => {
    const saved = await auto.savePlan();
    if (saved) {
      setComposerOpen(false);
      onApplyPlan(saved);
    }
  }, [auto, onApplyPlan]);

  const quickStats = useMemo(() => ({
    practicePlans: auto.plans.filter((plan) => !plan.isArchived && plan.mode === "practice").length,
    realPlans: auto.plans.filter((plan) => !plan.isArchived && plan.mode === "real").length,
  }), [auto.plans]);

  return (
    <div className="space-y-5">
      {/* Active plan summary */}
      <ActivePlanSummary
        botConfig={botConfig}
        defaultPlan={auto.plans.find(p => p.isDefault)}
        serverStatus={serverStatus}
        serverHealth={serverHealth}
        scanLog={scanLog}
        onRunNow={onRunNow}
        onStopBot={onStopBot}
      />

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Automation Plans</h3>
          <p className="text-xs text-gray-500 mt-1">
            Build a paper or live robot plan, then start it immediately from here. Practice plans: {quickStats.practicePlans} · Live plans: {quickStats.realPlans}
          </p>
        </div>
        <button
          onClick={() => setComposerOpen((value) => !value)}
          className="px-4 py-2 rounded-lg bg-[#FF4D00] text-white text-sm font-semibold hover:bg-[#e04400] transition"
        >
          {composerOpen || auto.editingId ? "Close plan builder" : "New plan"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {(composerOpen || auto.editingId) && (
          <MarketAutomationBuilder
            draft={auto.draft}
            editingId={auto.editingId}
            controlLevel={auto.controlLevel}
            onControlLevelChange={auto.setControlLevel}
            onFieldChange={auto.setDraftField}
            onSave={handleSave}
            onSaveAndApply={handleSaveAndApply}
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

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">How this works:</span> Save Draft only stores the plan. Save + Start Robot stores it, applies it, switches the robot on, and triggers an immediate scan. Run scan now is the fastest way to verify that paper-mode execution is alive.
        </p>
      </div>
    </div>
  );
}

function ActivePlanSummary({
  botConfig,
  defaultPlan,
  serverStatus,
  serverHealth,
  scanLog,
  onRunNow,
  onStopBot,
}: {
  botConfig: BotConfig;
  defaultPlan?: AutomationPlan;
  serverStatus: ServerBotStatus;
  serverHealth: SchedulerHealthViewModel | null;
  scanLog: string[];
  onRunNow: () => void;
  onStopBot: () => void;
}) {
  const isRunning = botConfig.botRunning && !botConfig.botPaused;
  const recentLogLines = scanLog.slice(0, 4);
  const nextRunLabel = serverHealth?.nextEligibleRunIso
    ? new Date(serverHealth.nextEligibleRunIso).toLocaleTimeString()
    : null;

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
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={onRunNow}
          className="px-3 py-1.5 rounded-lg bg-[#FF4D00] text-white text-xs font-semibold hover:bg-[#e04400] transition"
        >
          Run scan now
        </button>
        {isRunning && (
          <button
            onClick={onStopBot}
            className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition"
          >
            Stop robot
          </button>
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
            {serverHealth?.lastRunIso ? new Date(serverHealth.lastRunIso).toLocaleTimeString() : botConfig.lastScan ? new Date(botConfig.lastScan).toLocaleTimeString() : "—"}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
        <div className="rounded-xl bg-white/70 border border-white px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Server status</p>
          <p className="mt-1 font-semibold text-gray-900 capitalize">{serverStatus}</p>
        </div>
        <div className="rounded-xl bg-white/70 border border-white px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Runs today</p>
          <p className="mt-1 font-semibold text-gray-900">{serverHealth?.runsToday ?? 0}</p>
        </div>
        <div className="rounded-xl bg-white/70 border border-white px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Trades today</p>
          <p className="mt-1 font-semibold text-gray-900">{serverHealth?.tradesToday ?? 0}</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-white/70 border border-white px-3 py-3 text-xs text-gray-600">
        <p className="font-semibold text-gray-900">Verification</p>
        <p className="mt-1">
          {serverHealth?.lastRunIso
            ? `Last server-confirmed run was ${new Date(serverHealth.lastRunIso).toLocaleTimeString()}.`
            : "No server-confirmed scheduler run yet for this user."}
          {nextRunLabel ? ` Next eligible background run: ${nextRunLabel}.` : ""}
        </p>
        {(serverHealth?.tradesToday ?? 0) === 0 && serverStatus !== "stopped" && (
          <p className="mt-1 text-amber-700">The robot can be on and still place zero trades if no markets pass filters. Use Run scan now and check the messages below for proof of execution.</p>
        )}
      </div>
      <div className="mt-3 rounded-xl bg-white/70 border border-white px-3 py-3">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Recent bot messages</p>
        {recentLogLines.length === 0 ? (
          <p className="text-xs text-gray-500">No local scan messages yet. Use Run scan now or Save + Start Robot to verify execution immediately.</p>
        ) : (
          <div className="space-y-1">
            {recentLogLines.map((line) => (
              <p key={line} className="text-xs text-gray-600">{line}</p>
            ))}
          </div>
        )}
        {serverHealth?.lastError && (
          <p className="text-xs text-red-600 mt-2">Last server error: {serverHealth.lastError}</p>
        )}
      </div>
    </div>
  );
}
