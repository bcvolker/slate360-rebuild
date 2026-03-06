/**
 * Market Robot layout presets — canonical tab/panel definitions.
 * Follows the TabLayoutPrefs contract from CUSTOMIZATION_SYSTEM.md.
 */

export const MARKET_LAYOUT_PREFS_VERSION = 1;

export type MarketLayoutMode = "simple" | "standard" | "advanced" | "custom";

export interface MarketTabPref {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface MarketLayoutPrefs {
  version: number;
  tabId: "market";
  mode: MarketLayoutMode;
  tabs: MarketTabPref[];
}

export const DEFAULT_MARKET_TABS: MarketTabPref[] = [
  { id: "start-here", label: "Start Here", visible: true, order: 0 },
  { id: "direct-buy", label: "Direct Buy", visible: true, order: 1 },
  { id: "automation", label: "Automation", visible: true, order: 2 },
  { id: "saved-markets", label: "Saved Markets", visible: true, order: 3 },
  { id: "results", label: "Results", visible: true, order: 4 },
  { id: "live-wallet", label: "Live Wallet", visible: true, order: 5 },
];

export const DEFAULT_MARKET_LAYOUT: MarketLayoutPrefs = {
  version: MARKET_LAYOUT_PREFS_VERSION,
  tabId: "market",
  mode: "standard",
  tabs: DEFAULT_MARKET_TABS,
};

/** Merge saved prefs with defaults — adds new tabs, preserves user order/visibility. */
export function mergeMarketTabs(
  defaults: MarketTabPref[],
  saved: MarketTabPref[],
): MarketTabPref[] {
  const savedById = new Map(saved.map((t) => [t.id, t]));
  const merged: MarketTabPref[] = [];

  // Keep saved order for known tabs
  for (const s of saved) {
    const def = defaults.find((d) => d.id === s.id);
    if (def) {
      merged.push({ ...def, visible: s.visible, order: s.order });
    }
  }

  // Append any new default tabs the user hasn't seen yet
  for (const def of defaults) {
    if (!savedById.has(def.id)) {
      merged.push({ ...def, order: merged.length });
    }
  }

  return merged.sort((a, b) => a.order - b.order);
}
