"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useMarketAutomationState } from "@/lib/hooks/useMarketAutomationState";
import MarketAutomationBuilder from "@/components/dashboard/market/MarketAutomationBuilder";
import MarketPlanList from "@/components/dashboard/market/MarketPlanList";
import MarketSystemStatusCard from "@/components/dashboard/market/MarketSystemStatusCard";
import type { AutomationPlan, BotConfig } from "@/components/dashboard/market/types";
import {
  detectAutomationPreset,
  getAutomationPresetLabel,
} from "@/lib/market/automation-presets";
import type { MarketSystemStatusViewModel, SchedulerHealthViewModel } from "@/lib/market/contracts";
import type { ServerBotStatus } from "@/lib/hooks/useMarketServerStatus";
import { useMarketSystemStatus } from "@/lib/hooks/useMarketSystemStatus";

interface MarketAutomationTabProps {
  botConfig: BotConfig;
  onApplyPlan: (plan: AutomationPlan) => void;
  onRunNow: () => void;
  onStopBot: () => void;
  serverStatus: ServerBotStatus;
  serverHealth: SchedulerHealthViewModel | null;
  scanLog: string[];
}

type ActionFeedback = {
  type: "info" | "success" | "warning";
  message: string;
};

export default function MarketAutomationTab({ botConfig, onApplyPlan, onRunNow, onStopBot, serverStatus, serverHealth, scanLog }: MarketAutomationTabProps) {
  const auto = useMarketAutomationState();
  const [composerOpen, setComposerOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const systemStatus = useMarketSystemStatus();

  const handleApply = useCallback((plan: AutomationPlan) => {
    onApplyPlan(plan);
  }, [onApplyPlan]);

  const handleSave = useCallback(async () => {
    const result = await auto.savePlan();
    if (result) {
      setComposerOpen(false);
      await systemStatus.refresh();
      setActionFeedback(
        result.persistedToServer
          ? {
              type: "success",
              message: "Saved: plan is persisted to server and available for later start.",
            }
          : {
              type: "warning",
              message: "Saved locally only: server save did not confirm, so this draft is not canonical runtime truth yet.",
            },
      );
    }
  }, [auto, systemStatus]);

  const handleSaveAndApply = useCallback(async () => {
    const result = await auto.savePlan();
    if (result) {
      setComposerOpen(false);
      onApplyPlan(result.plan);
      await systemStatus.refresh();
      setActionFeedback(
        result.persistedToServer
          ? {
              type: "info",
              message: "Saved + Started requested: waiting for server runtime confirmation before treating this as running.",
            }
          : {
              type: "warning",
              message: "Start requested from local fallback save. Runtime may use older server config until server save succeeds.",
            },
      );
    }
  }, [auto, onApplyPlan, systemStatus]);

  const handleRunNow = useCallback(async () => {
    onRunNow();
    await systemStatus.refresh();
    setActionFeedback({
      type: "info",
      message: "Run Scan Now requested: check Runtime Status and recent scan messages for confirmed execution.",
    });
  }, [onRunNow, systemStatus]);

  const handleStopBot = useCallback(async () => {
    onStopBot();
    await systemStatus.refresh();
    setActionFeedback({
      type: "info",
      message: "Stop requested: shown as stopped only after server runtime status confirms it.",
    });
  }, [onStopBot, systemStatus]);

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
        system={systemStatus.system}
        serverStatus={serverStatus}
        serverHealth={serverHealth}
        scanLog={scanLog}
        onRunNow={handleRunNow}
        onStopBot={handleStopBot}
      />

      {actionFeedback && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            actionFeedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : actionFeedback.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {actionFeedback.message}
        </div>
      )}

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

      <MarketSystemStatusCard
        system={systemStatus.system}
        loading={systemStatus.loading}
        error={systemStatus.error}
        title="Automation backend health"
      />

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
          <span className="font-semibold text-slate-800">How this works:</span> Save Draft stores configuration only. Save + Start Robot stores then requests runtime start. Run Scan Now requests an immediate scan using current runtime settings. Stop / Halt sends a stop request. Runtime state and config source are only canonical after server confirmation.
        </p>
      </div>
    </div>
  );
}

function ActivePlanSummary({
  botConfig,
  defaultPlan,
  system,
  serverStatus,
  serverHealth,
  scanLog,
  onRunNow,
  onStopBot,
}: {
  botConfig: BotConfig;
  defaultPlan?: AutomationPlan;
  system: MarketSystemStatusViewModel | null;
  serverStatus: ServerBotStatus;
  serverHealth: SchedulerHealthViewModel | null;
  scanLog: string[];
  onRunNow: () => void;
  onStopBot: () => void;
}) {
  const isRunning = serverStatus === "running" || serverStatus === "paper";
  const runtimeLabel = isRunning ? "Running" : serverStatus === "paused" ? "Paused" : "Stopped";
  const presetLabel = defaultPlan ? detectAutomationPreset(defaultPlan) : null;
  const recentLogLines = scanLog.slice(0, 4);
  const [showDebug, setShowDebug] = React.useState(false);

  return (
    <div className={`rounded-2xl border p-4 ${isRunning ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"}`}>
      {/* Status + actions row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            {isRunning ? "🟢 Runtime Running" : "⏸️ Runtime Not Running"}
            {botConfig.paperMode && (
              <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">Practice</span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {defaultPlan ? `Plan: ${defaultPlan.name}` : "No plan selected"}
            {" · "}${botConfig.capitalAlloc} budget · {botConfig.maxTradesPerDay} trades/day · {botConfig.riskMix} risk
            {presetLabel && ` · ${getAutomationPresetLabel(presetLabel)} preset`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Save state: {defaultPlan ? "Saved" : "Not saved"} · Runtime state: {runtimeLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRunNow}
            className="px-3 py-1.5 rounded-lg bg-[#FF4D00] text-white text-xs font-semibold hover:bg-[#e04400] transition"
          >
            Run Scan Now
          </button>
          {isRunning && (
            <button
              onClick={onStopBot}
              className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition"
            >
              Stop / Halt
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
        <p>
          <span className="font-semibold">Config source:</span> {system?.configSourceLabel ?? "Unknown"}
          {system?.configSource ? ` (${system.configSource})` : ""}
        </p>
        {system && system.configSource !== "market_plans" && (
          <p className="mt-1 text-amber-700">
            Runtime is using fallback source, not canonical market_plans.
            {system.hasLegacyDirective ? " Legacy directives are active." : ""}
            {system.hasRuntimeMetadata ? " Runtime metadata overlay is active." : ""}
          </p>
        )}
        <p className="mt-1 text-slate-500">Action meanings: Save Draft = config only. Save + Start Robot = config + start request. Run Scan Now = one immediate scan request. Stop / Halt = stop request.</p>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        <div className="rounded-lg bg-white/70 border border-white px-2 py-1.5">
          <span className="text-gray-400">Trades today</span>
          <p className="font-bold text-gray-900">{serverHealth?.tradesToday ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white/70 border border-white px-2 py-1.5">
          <span className="text-gray-400">Scans today</span>
          <p className="font-bold text-gray-900">{serverHealth?.runsToday ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white/70 border border-white px-2 py-1.5">
          <span className="text-gray-400">Last scan</span>
          <p className="font-bold text-gray-900">
            {serverHealth?.lastRunIso ? new Date(serverHealth.lastRunIso).toLocaleTimeString() : "—"}
          </p>
        </div>
      </div>

      {/* Recent messages */}
      {recentLogLines.length > 0 && (
        <div className="mt-3 space-y-1">
          {recentLogLines.map((line, i) => (
            <p key={i} className="text-xs text-gray-600">{line}</p>
          ))}
        </div>
      )}

      {serverHealth?.lastError && (
        <p className="text-xs text-red-600 mt-2">Last error: {serverHealth.lastError}</p>
      )}

      {/* Collapsible debug info */}
      <button
        onClick={() => setShowDebug(v => !v)}
        className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 transition"
      >
        {showDebug ? "▲ Hide server details" : "▼ Server details"}
      </button>
      {showDebug && (
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          <p>Server status: <strong className="text-gray-700 capitalize">{serverStatus}</strong></p>
          {serverHealth?.nextEligibleRunIso && (
            <p>Next background run: {new Date(serverHealth.nextEligibleRunIso).toLocaleTimeString()}</p>
          )}
          {(serverHealth?.tradesToday ?? 0) === 0 && serverStatus !== "stopped" && (
            <p className="text-amber-700">Robot is on but placed no trades yet — no markets may match your filters right now.</p>
          )}
        </div>
      )}
    </div>
  );
}
