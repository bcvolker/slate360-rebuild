"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  type MarketLayoutPrefs,
  type MarketTabPref,
  type MarketLayoutMode,
  DEFAULT_MARKET_LAYOUT,
  DEFAULT_MARKET_TABS,
  MARKET_LAYOUT_PREFS_VERSION,
  mergeMarketTabs,
} from "@/lib/market/layout-presets";

const LS_KEY = "layoutprefs-market";
const LEGACY_LS_KEY = "market_tab_prefs_v1";

function loadPrefs(): MarketLayoutPrefs {
  if (typeof window === "undefined") return DEFAULT_MARKET_LAYOUT;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MarketLayoutPrefs;
      if (parsed.version === MARKET_LAYOUT_PREFS_VERSION) {
        return {
          ...parsed,
          tabs: mergeMarketTabs(DEFAULT_MARKET_TABS, parsed.tabs),
        };
      }
    }

    // Migrate from legacy key if present
    const legacy = localStorage.getItem(LEGACY_LS_KEY);
    if (legacy) {
      const legacyTabs = JSON.parse(legacy) as Array<{
        id: string;
        label: string;
        visible: boolean;
      }>;
      // Legacy tabs used the old tab set — we can't directly map them,
      // so we just carry visibility for any IDs that overlap
      const migrated: MarketLayoutPrefs = {
        ...DEFAULT_MARKET_LAYOUT,
        tabs: DEFAULT_MARKET_TABS.map((def, i) => {
          const match = legacyTabs.find(
            (lt) =>
              lt.id.toLowerCase().replace(/\s+/g, "-") === def.id ||
              lt.label === def.label,
          );
          return match ? { ...def, visible: match.visible, order: i } : def;
        }),
      };
      // Save to new key, remove legacy
      localStorage.setItem(LS_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_LS_KEY);
      return migrated;
    }
  } catch {
    /* corrupted — fall through to defaults */
  }
  return DEFAULT_MARKET_LAYOUT;
}

function persistPrefs(prefs: MarketLayoutPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage full — non-critical */
  }
  // Best-effort server sync (reuse existing backward-compat route)
  fetch("/api/market/tab-prefs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tabs: prefs.tabs.map((t) => ({
        id: t.id,
        label: t.label,
        visible: t.visible,
      })),
    }),
  }).catch(() => {
    /* non-critical */
  });
}

export function useMarketLayoutPrefs() {
  const [prefs, setPrefsRaw] = useState<MarketLayoutPrefs>(DEFAULT_MARKET_LAYOUT);
  const initialRef = useRef<MarketLayoutPrefs | null>(null);

  // Load once on mount (client only)
  useEffect(() => {
    const loaded = loadPrefs();
    setPrefsRaw(loaded);
    initialRef.current = loaded;
  }, []);

  const isDirty = useCallback(() => {
    if (!initialRef.current) return false;
    return JSON.stringify(prefs.tabs) !== JSON.stringify(initialRef.current.tabs)
      || prefs.mode !== initialRef.current.mode;
  }, [prefs]);

  const setTabs = useCallback((tabs: MarketTabPref[]) => {
    setPrefsRaw((prev) => {
      const next = { ...prev, tabs };
      persistPrefs(next);
      return next;
    });
  }, []);

  const setMode = useCallback((mode: MarketLayoutMode) => {
    setPrefsRaw((prev) => {
      const next = { ...prev, mode };
      persistPrefs(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const fresh = { ...DEFAULT_MARKET_LAYOUT };
    setPrefsRaw(fresh);
    persistPrefs(fresh);
    initialRef.current = fresh;
  }, []);

  const reorderTab = useCallback(
    (fromId: string, toId: string) => {
      setPrefsRaw((prev) => {
        const tabs = [...prev.tabs];
        const fromIdx = tabs.findIndex((t) => t.id === fromId);
        const toIdx = tabs.findIndex((t) => t.id === toId);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const [moved] = tabs.splice(fromIdx, 1);
        tabs.splice(toIdx, 0, moved);
        const reordered = tabs.map((t, i) => ({ ...t, order: i }));
        const next = { ...prev, tabs: reordered };
        persistPrefs(next);
        return next;
      });
    },
    [],
  );

  const toggleTabVisibility = useCallback((id: string) => {
    setPrefsRaw((prev) => {
      const next = {
        ...prev,
        tabs: prev.tabs.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t)),
      };
      // Ensure at least one tab is visible
      if (next.tabs.filter((t) => t.visible).length === 0) return prev;
      persistPrefs(next);
      return next;
    });
  }, []);

  const visibleTabs = prefs.tabs.filter((t) => t.visible);

  return {
    prefs,
    visibleTabs,
    isDirty: isDirty(),
    setTabs,
    setMode,
    reorderTab,
    toggleTabVisibility,
    resetToDefaults,
  };
}
