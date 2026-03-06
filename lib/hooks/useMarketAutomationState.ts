"use client";

import { useState, useEffect, useCallback } from "react";
import type { AutomationPlan, RiskLevel, ScanMode, FillPolicy, ExitRules } from "@/components/dashboard/market/types";

const PLANS_KEY = "slate360_automation_plans";

function defaultPlan(): AutomationPlan {
  return {
    id: "", name: "",
    budget: 200, riskLevel: "balanced", categories: ["General"],
    scanMode: "balanced", maxTradesPerDay: 5, mode: "practice",
    maxDailyLoss: 40, maxOpenPositions: 3,
    maxPctPerTrade: 10, feeAlertThreshold: 5, cooldownAfterLossStreak: 2,
    largeTraderSignals: false, closingSoonFocus: false,
    slippage: 2, minimumLiquidity: 1000, maximumSpread: 5,
    fillPolicy: "conservative", exitRules: "auto",
    isDefault: false, isArchived: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

function loadPlans(): AutomationPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (raw) return JSON.parse(raw) as AutomationPlan[];
  } catch { /* ignore */ }
  return [];
}

function persistPlans(plans: AutomationPlan[]) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

export function useMarketAutomationState() {
  const [plans, setPlans] = useState<AutomationPlan[]>([]);
  const [draft, setDraft] = useState<AutomationPlan>(defaultPlan);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [controlLevel, setControlLevel] = useState<"basic" | "intermediate" | "advanced">("basic");

  useEffect(() => { setPlans(loadPlans()); }, []);

  const updateDraft = useCallback((patch: Partial<AutomationPlan>) => {
    setDraft(prev => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  }, []);

  const setDraftField = useCallback(<K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => {
    setDraft(prev => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(defaultPlan());
    setEditingId(null);
    setControlLevel("basic");
  }, []);

  const savePlan = useCallback(() => {
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    const plan: AutomationPlan = {
      ...draft,
      id: editingId || Date.now().toString(),
      updatedAt: now,
      createdAt: editingId ? draft.createdAt : now,
    };
    const next = editingId
      ? plans.map(p => (p.id === editingId ? plan : p))
      : [plan, ...plans];
    setPlans(next);
    persistPlans(next);
    resetDraft();
    return plan;
  }, [draft, editingId, plans, resetDraft]);

  const deletePlan = useCallback((id: string) => {
    const next = plans.filter(p => p.id !== id);
    setPlans(next);
    persistPlans(next);
  }, [plans]);

  const clonePlan = useCallback((id: string) => {
    const source = plans.find(p => p.id === id);
    if (!source) return;
    const clone: AutomationPlan = {
      ...source,
      id: Date.now().toString(),
      name: `${source.name} (copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [clone, ...plans];
    setPlans(next);
    persistPlans(next);
  }, [plans]);

  const renamePlan = useCallback((id: string, name: string) => {
    const next = plans.map(p => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p));
    setPlans(next);
    persistPlans(next);
  }, [plans]);

  const archivePlan = useCallback((id: string) => {
    const next = plans.map(p =>
      p.id === id ? { ...p, isArchived: !p.isArchived, updatedAt: new Date().toISOString() } : p,
    );
    setPlans(next);
    persistPlans(next);
  }, [plans]);

  const setDefaultPlan = useCallback((id: string) => {
    const next = plans.map(p => ({
      ...p,
      isDefault: p.id === id ? !p.isDefault : false,
      updatedAt: new Date().toISOString(),
    }));
    setPlans(next);
    persistPlans(next);
  }, [plans]);

  const startEdit = useCallback((id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    setDraft(plan);
    setEditingId(id);
  }, [plans]);

  return {
    plans, draft, editingId, controlLevel,
    setControlLevel, updateDraft, setDraftField, resetDraft,
    savePlan, deletePlan, clonePlan, renamePlan, archivePlan,
    setDefaultPlan, startEdit,
  };
}

export type { RiskLevel, ScanMode, FillPolicy, ExitRules };
