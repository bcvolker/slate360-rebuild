import type { AutomationPlan } from "@/components/dashboard/market/types";

export interface SyncResult {
  ok: boolean;
  status: number;
  error?: string;
  planId?: string;
}

/**
 * Persist or update an automation plan to the canonical `market_plans` table.
 * This replaces the legacy dual-write that previously synced to `market_directives`.
 */
export async function syncAutomationPlan(plan: AutomationPlan): Promise<SyncResult> {
  const method = plan.id ? "PATCH" : "POST";
  const body: AutomationPlan = {
    ...plan,
    isDefault: plan.isDefault ?? true,
    isArchived: false,
  };

  const response = await fetch("/api/market/plans", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
    return {
      ok: false,
      status: response.status,
      error: typeof errData.error === "string" ? errData.error : `HTTP ${response.status}`,
    };
  }

  const data = await response.json() as { plan?: { id?: string } };
  return { ok: true, status: response.status, planId: data.plan?.id };
}

/** Set bot-status to running/paper so the scheduler picks it up */
export async function ensureBotRunning(paperMode: boolean): Promise<boolean> {
  try {
    const res = await fetch("/api/market/bot-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: paperMode ? "paper" : "running" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}