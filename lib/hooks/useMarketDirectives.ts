"use client";

import { useState, useCallback } from "react";
import type { BuyDirective } from "@/components/dashboard/market/types";

interface BotSetters {
  setCapitalAlloc: (v: number) => void;
  setRiskMix: (v: "conservative" | "balanced" | "aggressive") => void;
  setWhaleFollow: (v: boolean) => void;
  setFocusAreas: (v: string[]) => void;
  setPaperMode: (v: boolean) => void;
  setBotRunning: (v: boolean) => void;
  setBotPaused: (v: boolean) => void;
}

interface UseMarketDirectivesDeps {
  botSetters: BotSetters;
  runScan: () => Promise<void>;
  addLog: (msg: string) => void;
  onSetActiveTab: (tab: string) => void;
}

export function useMarketDirectives({ botSetters, runScan, addLog, onSetActiveTab }: UseMarketDirectivesDeps) {
  const [directives, setDirectives] = useState<BuyDirective[]>([]);
  const [editingDirective, setEditingDirective] = useState<BuyDirective | null>(null);
  const [directiveName, setDirectiveName] = useState("");
  const [directiveAmount, setDirectiveAmount] = useState(100);
  const [directiveTimeframe, setDirectiveTimeframe] = useState("1w");
  const [directiveBuysPerDay, setDirectiveBuysPerDay] = useState(3);
  const [directiveRisk, setDirectiveRisk] = useState<BuyDirective["risk_mix"]>("balanced");
  const [directiveWhale, setDirectiveWhale] = useState(false);
  const [directiveFocus, setDirectiveFocus] = useState<string[]>(["Construction"]);
  const [directiveStrategy, setDirectiveStrategy] = useState<BuyDirective["profit_strategy"]>("arbitrage");
  const [directivePaper, setDirectivePaper] = useState(true);
  const [directiveDailyLossCap, setDirectiveDailyLossCap] = useState(40);
  const [directiveMoonshot, setDirectiveMoonshot] = useState(false);
  const [directiveTotalLossCap, setDirectiveTotalLossCap] = useState(200);
  const [directiveAutoPauseDays, setDirectiveAutoPauseDays] = useState(3);
  const [directiveTargetProfitMonthly, setDirectiveTargetProfitMonthly] = useState(6500);
  const [directiveTakeProfitPct, setDirectiveTakeProfitPct] = useState(20);
  const [directiveStopLossPct, setDirectiveStopLossPct] = useState(10);

  const resetDirectiveForm = useCallback(() => {
    setEditingDirective(null); setDirectiveName(""); setDirectiveAmount(100);
    setDirectiveTimeframe("1w"); setDirectiveBuysPerDay(3); setDirectiveRisk("balanced");
    setDirectiveWhale(false); setDirectiveFocus(["Construction"]); setDirectiveStrategy("arbitrage");
    setDirectivePaper(true); setDirectiveDailyLossCap(40); setDirectiveMoonshot(false);
    setDirectiveTotalLossCap(200); setDirectiveAutoPauseDays(3); setDirectiveTargetProfitMonthly(6500);
    setDirectiveTakeProfitPct(20); setDirectiveStopLossPct(10);
  }, []);

  const loadDirectives = useCallback(async () => {
    try {
      const res = await fetch("/api/market/directives", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as { directives?: BuyDirective[] };
        setDirectives(data.directives ?? []);
        return;
      }
    } catch { /* fallback to localStorage */ }
    try {
      const saved = localStorage.getItem("slate360_directives");
      if (saved) setDirectives(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveDirectivesLocally = useCallback((list: BuyDirective[]) => {
    localStorage.setItem("slate360_directives", JSON.stringify(list));
    setDirectives(list);
  }, []);

  const handleSaveDirective = useCallback(async () => {
    if (!directiveName.trim()) return;
    const d: BuyDirective = {
      id: editingDirective?.id || Date.now().toString(),
      name: directiveName, amount: directiveAmount, timeframe: directiveTimeframe,
      buys_per_day: directiveBuysPerDay, risk_mix: directiveRisk, whale_follow: directiveWhale,
      focus_areas: directiveFocus, profit_strategy: directiveStrategy, paper_mode: directivePaper,
      daily_loss_cap: directiveDailyLossCap, moonshot_mode: directiveMoonshot,
      total_loss_cap: directiveTotalLossCap, auto_pause_losing_days: directiveAutoPauseDays,
      target_profit_monthly: directiveTargetProfitMonthly,
      take_profit_pct: directiveTakeProfitPct, stop_loss_pct: directiveStopLossPct,
      created_at: new Date().toISOString(),
    };
    try {
      const method = editingDirective ? "PATCH" : "POST";
      const res = await fetch("/api/market/directives", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(d),
      });
      if (res.ok) {
        const data = await res.json() as { directive?: BuyDirective };
        if (data.directive) {
          const updated = [data.directive, ...directives.filter(x => x.id !== data.directive?.id)];
          setDirectives(updated);
          localStorage.setItem("slate360_directives", JSON.stringify(updated));
        }
      } else {
        saveDirectivesLocally([d, ...directives.filter(x => x.id !== d.id)]);
      }
    } catch {
      saveDirectivesLocally([d, ...directives.filter(x => x.id !== d.id)]);
    }
    resetDirectiveForm();
    addLog(`💾 Directive "${d.name}" saved`);
  }, [directiveName, editingDirective, directiveAmount, directiveTimeframe, directiveBuysPerDay,
      directiveRisk, directiveWhale, directiveFocus, directiveStrategy, directivePaper,
      directiveDailyLossCap, directiveMoonshot, directiveTotalLossCap, directiveAutoPauseDays,
      directiveTargetProfitMonthly, directiveTakeProfitPct, directiveStopLossPct,
      directives, saveDirectivesLocally, resetDirectiveForm, addLog]);

  const applyDirective = useCallback(async (d: BuyDirective) => {
    const { setCapitalAlloc, setRiskMix, setWhaleFollow, setFocusAreas, setPaperMode, setBotRunning, setBotPaused } = botSetters;
    setDirectiveAmount(d.amount); setCapitalAlloc(d.amount);
    setDirectiveBuysPerDay(d.buys_per_day);
    setDirectiveRisk(d.risk_mix); setRiskMix(d.risk_mix);
    setDirectiveWhale(d.whale_follow); setWhaleFollow(d.whale_follow);
    setDirectiveFocus(d.focus_areas); setFocusAreas(d.focus_areas);
    setDirectiveStrategy(d.profit_strategy);
    setDirectivePaper(d.paper_mode); setPaperMode(d.paper_mode);
    setDirectiveDailyLossCap(d.daily_loss_cap ?? 40);
    setDirectiveMoonshot(d.moonshot_mode ?? false);
    setDirectiveTotalLossCap(d.total_loss_cap ?? 200);
    setDirectiveAutoPauseDays(d.auto_pause_losing_days ?? 3);
    setDirectiveTargetProfitMonthly(d.target_profit_monthly ?? 6500);
    setDirectiveTakeProfitPct(d.take_profit_pct ?? 20);
    setDirectiveStopLossPct(d.stop_loss_pct ?? 10);
    addLog(`📋 Directive "${d.name}" applied to bot`);
    try {
      await fetch("/api/market/bot-status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "running" }),
      });
      setBotRunning(true); setBotPaused(false);
      addLog(`🤖 Autopilot started with directive "${d.name}"`);
      await runScan();
    } catch {
      addLog("⚠️ Directive applied, but scheduler start call failed.");
    }
    onSetActiveTab("Dashboard");
  }, [botSetters, addLog, runScan, onSetActiveTab]);

  const startEditDirective = useCallback((d: BuyDirective) => {
    setEditingDirective(d); setDirectiveName(d.name); setDirectiveAmount(d.amount);
    setDirectiveTimeframe(d.timeframe); setDirectiveBuysPerDay(d.buys_per_day);
    setDirectiveRisk(d.risk_mix); setDirectiveWhale(d.whale_follow); setDirectiveFocus(d.focus_areas);
    setDirectiveStrategy(d.profit_strategy); setDirectivePaper(d.paper_mode);
    setDirectiveDailyLossCap(d.daily_loss_cap ?? 40); setDirectiveMoonshot(d.moonshot_mode ?? false);
    setDirectiveTotalLossCap(d.total_loss_cap ?? 200); setDirectiveAutoPauseDays(d.auto_pause_losing_days ?? 3);
    setDirectiveTargetProfitMonthly(d.target_profit_monthly ?? 6500);
    setDirectiveTakeProfitPct(d.take_profit_pct ?? 20); setDirectiveStopLossPct(d.stop_loss_pct ?? 10);
  }, []);

  const deleteDirective = useCallback(async (id: string) => {
    const prev = directives;
    const next = prev.filter(d => d.id !== id);
    setDirectives(next);
    localStorage.setItem("slate360_directives", JSON.stringify(next));
    try {
      const res = await fetch(`/api/market/directives?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) { setDirectives(prev); localStorage.setItem("slate360_directives", JSON.stringify(prev)); }
    } catch { setDirectives(prev); localStorage.setItem("slate360_directives", JSON.stringify(prev)); }
  }, [directives]);

  return {
    directives,
    editingDirective,
    directiveState: {
      directiveName, directiveAmount, directiveTimeframe, directiveBuysPerDay,
      directiveRisk, directiveWhale, directiveFocus, directiveStrategy, directivePaper,
      directiveDailyLossCap, directiveMoonshot, directiveTotalLossCap, directiveAutoPauseDays,
      directiveTargetProfitMonthly, directiveTakeProfitPct, directiveStopLossPct,
    },
    directiveSetters: {
      setDirectiveName, setDirectiveAmount, setDirectiveTimeframe, setDirectiveBuysPerDay,
      setDirectiveRisk, setDirectiveWhale, setDirectiveFocus, setDirectiveStrategy, setDirectivePaper,
      setDirectiveDailyLossCap, setDirectiveMoonshot, setDirectiveTotalLossCap, setDirectiveAutoPauseDays,
      setDirectiveTargetProfitMonthly, setDirectiveTakeProfitPct, setDirectiveStopLossPct,
    },
    loadDirectives,
    handleSaveDirective,
    applyDirective,
    startEditDirective,
    deleteDirective,
    resetDirectiveForm,
  };
}
