import type { AutomationPlan } from "@/components/dashboard/market/types";

export type AutomationPresetKey = "conservative" | "balanced" | "aggressive";

const PRESET_ORDER: AutomationPresetKey[] = ["conservative", "balanced", "aggressive"];

const PRESET_PATCHES: Record<AutomationPresetKey, Partial<AutomationPlan>> = {
  conservative: {
    riskLevel: "conservative",
    budget: 150,
    maxTradesPerDay: 3,
    maxDailyLoss: 20,
    maxOpenPositions: 2,
    scanMode: "slow",
    maxPctPerTrade: 7,
    minimumLiquidity: 3000,
    maximumSpread: 3,
    largeTraderSignals: false,
    closingSoonFocus: false,
  },
  balanced: {
    riskLevel: "balanced",
    budget: 300,
    maxTradesPerDay: 8,
    maxDailyLoss: 60,
    maxOpenPositions: 4,
    scanMode: "balanced",
    maxPctPerTrade: 10,
    minimumLiquidity: 1500,
    maximumSpread: 5,
    largeTraderSignals: false,
    closingSoonFocus: false,
  },
  aggressive: {
    riskLevel: "aggressive",
    budget: 750,
    maxTradesPerDay: 20,
    maxDailyLoss: 150,
    maxOpenPositions: 8,
    scanMode: "fast",
    maxPctPerTrade: 15,
    minimumLiquidity: 500,
    maximumSpread: 8,
    largeTraderSignals: true,
    closingSoonFocus: true,
  },
};

const PRESET_LABELS: Record<AutomationPresetKey, string> = {
  conservative: "Conservative",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

export function getAutomationPresetLabel(preset: AutomationPresetKey): string {
  return PRESET_LABELS[preset];
}

export function applyAutomationPreset(
  draft: AutomationPlan,
  preset: AutomationPresetKey,
): AutomationPlan {
  return {
    ...draft,
    ...PRESET_PATCHES[preset],
    updatedAt: new Date().toISOString(),
  };
}

function scorePresetMatch(
  draft: AutomationPlan,
  preset: AutomationPresetKey,
): number {
  const patch = PRESET_PATCHES[preset];
  let score = 0;
  const total = Object.keys(patch).length;

  for (const [key, expected] of Object.entries(patch)) {
    const draftValue = draft[key as keyof AutomationPlan];
    if (draftValue === expected) {
      score += 1;
    }
  }

  if (total === 0) {
    return 0;
  }

  return score / total;
}

export function detectAutomationPreset(
  draft: AutomationPlan,
): AutomationPresetKey | null {
  const best = PRESET_ORDER
    .map((preset) => ({ preset, score: scorePresetMatch(draft, preset) }))
    .sort((a, b) => b.score - a.score)[0];

  if (!best || best.score < 0.65) {
    return null;
  }

  return best.preset;
}
