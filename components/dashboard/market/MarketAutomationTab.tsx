"use client";

import React, { useState } from "react";
import MarketSystemStatusCard from "@/components/dashboard/market/MarketSystemStatusCard";
import MarketPlanInsights from "@/components/dashboard/market/MarketPlanInsights";
import { useMarketAutomationState } from "@/lib/hooks/useMarketAutomationState";
import { useMarketSystemStatus } from "@/lib/hooks/useMarketSystemStatus";

/**
 * MarketAutomationTab - Build, save, edit, and run automation plans.
 * Owns automation builder, saved plans list, current automation state.
 * Updated to accept required props from MarketClient.tsx.
 */

export default function MarketAutomationTab({
  onNavigate,
  paperMode,
  onQuickStart,
  onStopBot,
  activePlan,
  onApplyPlan,
  onDeletePlan,
}: {
  onNavigate: (tabId: string) => void;
  paperMode: boolean;
  onQuickStart?: () => void;
  onStopBot?: () => void;
  activePlan?: unknown;
  onApplyPlan?: (plan: unknown) => void;
  onDeletePlan?: (planId: string) => void;
}) {
  const automation = useMarketAutomationState();
  const systemStatus = useMarketSystemStatus();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [botRunning, setBotRunning] = useState(false);

  const handleToggleAdvanced = () => setShowAdvanced(!showAdvanced);

  const hasActivePlan = activePlan !== null || automation.plans.length > 0;
  const canStartAutomation = hasActivePlan && !botRunning;

  return (
    <section className="rounded-[32px] border border-slate-700 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)] mb-6">
      <h1 className="text-3xl font-black text-slate-50 mb-3">Automation</h1>
      <p className="text-slate-300 text-base max-w-3xl mb-6 leading-7">
        Build, save, and run automation plans to trade on Polymarket without manual intervention. Start with practice mode to test strategies.
      </p>

      <MarketSystemStatusCard
        title="Automation Readiness"
        system={systemStatus.system}
        loading={systemStatus.loading}
        error={systemStatus.error}
      />

      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 mb-6 mt-6">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Automation Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Plan Name</label>
            <input
              type="text"
              placeholder="e.g., Political Events Edge"
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Market Category</label>
            <select className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>Any Category</option>
              <option>Politics</option>
              <option>Sports</option>
              <option>Finance</option>
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1">Search Terms (optional)</label>
          <input
            type="text"
            placeholder="e.g., election, candidate name"
            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition shadow-[0_4px_12px_rgba(253,101,41,0.3)]">
            Save Plan
          </button>
          {canStartAutomation && onQuickStart && (
            <button
              onClick={() => { onQuickStart(); setBotRunning(true); }}
              disabled={botRunning}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition shadow-[0_4px_12px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paperMode ? "Run One Paper Scan" : "Run Live Scan"}
            </button>
          )}
          {botRunning && onStopBot && (
            <button
              onClick={() => { onStopBot(); setBotRunning(false); }}
              className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition shadow-[0_4px_12px_rgba(239,68,68,0.3)]"
            >
              Stop Automation
            </button>
          )}
        </div>
        <button
          onClick={handleToggleAdvanced}
          className="mt-4 text-slate-400 text-sm hover:text-slate-200 transition"
        >
          {showAdvanced ? "▼ Hide advanced options" : "▲ Show advanced options"}
        </button>
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <h3 className="text-base font-medium text-slate-300 mb-3">Advanced Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Minimum Edge (%)</label>
                <input
                  type="number"
                  placeholder="5"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Risk Level</label>
                <select className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option>Balanced</option>
                  <option>Conservative</option>
                  <option>Aggressive</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {automation.draft && (
        <MarketPlanInsights draft={automation.draft} />
      )}
    </section>
  );
}
