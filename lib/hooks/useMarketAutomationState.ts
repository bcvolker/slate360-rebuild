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

async function fetchPlansFromServer(): Promise<AutomationPlan[] | null> {
  try {
    const res = await fetch("/api/market/plans", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json() as { plans?: AutomationPlan[] };
    return data.plans ?? [];
  } catch {
    return null;
  }
}

async function savePlanToServer(plan: AutomationPlan, isEdit: boolean): Promise<AutomationPlan | null> {
  try {
    const res = await fetch("/api/market/plans", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!res.ok) return null;
    const data = await res.json() as { plan?: AutomationPlan };
    return data.plan ?? null;
  } catch {
    return null;
  }
}

async function deletePlanFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/market/plans?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export interface SavePlanResult {
  plan: AutomationPlan;
  persistedToServer: boolean;
}

export function useMarketAutomationState() {
  const [plans, setPlans] = useState<AutomationPlan[]>([]);
  const [draft, setDraft] = useState<AutomationPlan>(defaultPlan);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [controlLevel, setControlLevel] = useState<"basic" | "intermediate" | "advanced">("basic");

  useEffect(() => {
    void (async () => {
      const serverPlans = await fetchPlansFromServer();
      if (serverPlans) {
        setPlans(serverPlans);
        persistPlans(serverPlans);
        return;
      }
      setPlans(loadPlans());
    })();
  }, []);

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

  const savePlan = useCallback(async (): Promise<SavePlanResult | null> => {
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    const optimistic: AutomationPlan = {
      ...draft,
      id: editingId || Date.now().toString(),
      updatedAt: now,
      createdAt: editingId ? draft.createdAt : now,
    };
    const next = editingId
      ? plans.map(p => (p.id === editingId ? optimistic : p))
      : [optimistic, ...plans];
    setPlans(next);
    persistPlans(next);
    const saved = await savePlanToServer(optimistic, Boolean(editingId));
    if (saved) {
      const refreshed = editingId
        ? next.map((plan) => (plan.id === saved.id ? saved : plan))
        : [saved, ...next.filter((plan) => plan.id !== optimistic.id)];
      setPlans(refreshed);
      persistPlans(refreshed);
      resetDraft();
      return { plan: saved, persistedToServer: true };
    }
    resetDraft();
    return { plan: optimistic, persistedToServer: false };
  }, [draft, editingId, plans, resetDraft]);

  const deletePlan = useCallback(async (id: string) => {
    const previous = plans;
    const next = previous.filter(p => p.id !== id);
    setPlans(next);
    persistPlans(next);
    const removed = await deletePlanFromServer(id);
    if (!removed) {
      setPlans(previous);
      persistPlans(previous);
    }
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

  const renamePlan = useCallback(async (id: string, name: string) => {
    const next = plans.map(p => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p));
    setPlans(next);
    persistPlans(next);
    const target = next.find((plan) => plan.id === id);
    if (target) await savePlanToServer(target, true);
  }, [plans]);

  const archivePlan = useCallback(async (id: string) => {
    const next = plans.map(p =>
      p.id === id ? { ...p, isArchived: !p.isArchived, updatedAt: new Date().toISOString() } : p,
    );
    setPlans(next);
    persistPlans(next);
    const target = next.find((plan) => plan.id === id);
    if (target) await savePlanToServer(target, true);
  }, [plans]);

  const setDefaultPlan = useCallback(async (id: string) => {
    const next = plans.map(p => ({
      ...p,
      isDefault: p.id === id ? !p.isDefault : false,
      updatedAt: new Date().toISOString(),
    }));
    setPlans(next);
    persistPlans(next);
    const updates = next.filter((plan) => plan.id === id || plan.isDefault === false);
    await Promise.all(updates.map((plan) => savePlanToServer(plan, true)));
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
