"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entitlements } from "@/lib/entitlements";
import {
  WIDGET_META,
  type WidgetPref,
  type WidgetSize,
  buildDefaultPrefs,
  DASHBOARD_STORAGE_KEY,
} from "@/lib/widgets/widget-meta";
import {
  loadWidgetPrefs,
  mergeWidgetPrefs,
  saveWidgetPrefs,
  WIDGET_PREFS_SCHEMA_VERSION,
} from "@/lib/widgets/widget-prefs-storage";

const DEFAULT_WIDGET_PREFS: WidgetPref[] = buildDefaultPrefs({ expandedIds: ["calendar", "seats"] });

export function useWidgetPrefsState(supabase: SupabaseClient, ent: Entitlements) {
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(DEFAULT_WIDGET_PREFS);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [dashDragIdx, setDashDragIdx] = useState<number | null>(null);

  // Hydration: sync from localStorage
  useEffect(() => {
    const storedPrefs = loadWidgetPrefs(DASHBOARD_STORAGE_KEY, DEFAULT_WIDGET_PREFS);
    setWidgetPrefs(storedPrefs);
  }, []);

  // Sync from Supabase user metadata
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      const saved = u?.user_metadata?.dashboardWidgets as WidgetPref[] | undefined;
      const savedVersion = Number(u?.user_metadata?.dashboardWidgetsVersion ?? 0);
      if (savedVersion === WIDGET_PREFS_SCHEMA_VERSION && saved && Array.isArray(saved) && saved.length > 0) {
        const merged = mergeWidgetPrefs(DEFAULT_WIDGET_PREFS, saved);
        setWidgetPrefs(merged);
        saveWidgetPrefs(DASHBOARD_STORAGE_KEY, merged);
      }
    });
  }, [supabase]);

  const toggleVisible = useCallback((id: string) => {
    setWidgetPrefs((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, visible: !p.visible } : p);
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setPrefsDirty(true);
  }, []);

  const setWidgetSize = useCallback((id: string, newSize: WidgetSize) => {
    setWidgetPrefs((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, size: newSize } : p);
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setPrefsDirty(true);
  }, []);

  const moveWidget = useCallback((id: string, dir: -1 | 1) => {
    setWidgetPrefs((prev) => {
      const arr = [...prev].sort((a, b) => a.order - b.order);
      const idx = arr.findIndex((p) => p.id === id);
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      const newArr = arr.map((p, i) => {
        if (i === idx) return { ...p, order: arr[target].order };
        if (i === target) return { ...p, order: arr[idx].order };
        return p;
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, newArr);
      return newArr;
    });
    setPrefsDirty(true);
  }, []);

  const savePrefs = useCallback(async () => {
    setPrefsSaving(true);
    try {
      await supabase.auth.updateUser({
        data: { dashboardWidgets: widgetPrefs, dashboardWidgetsVersion: WIDGET_PREFS_SCHEMA_VERSION },
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, widgetPrefs);
      setPrefsDirty(false);
    } finally {
      setPrefsSaving(false);
    }
  }, [supabase, widgetPrefs]);

  const resetPrefs = useCallback(() => {
    setWidgetPrefs(DEFAULT_WIDGET_PREFS);
    saveWidgetPrefs(DASHBOARD_STORAGE_KEY, DEFAULT_WIDGET_PREFS);
    setPrefsDirty(true);
  }, []);

  const handleDashDragStart = useCallback((idx: number) => setDashDragIdx(idx), []);

  const handleDashDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dashDragIdx === null || dashDragIdx === idx) return;
    setWidgetPrefs((prev) => {
      const vis = [...prev].filter((p) => p.visible).sort((a, b) => a.order - b.order);
      const visIds = vis.map((p) => p.id);
      const [moved] = visIds.splice(dashDragIdx, 1);
      visIds.splice(idx, 0, moved);
      const next = prev.map((p) => {
        const visIdx = visIds.indexOf(p.id);
        return visIdx >= 0 ? { ...p, order: visIdx } : p;
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setDashDragIdx(idx);
    setPrefsDirty(true);
  }, [dashDragIdx]);

  const handleDashDragEnd = useCallback(() => setDashDragIdx(null), []);

  const drawerMeta = useMemo(() => {
    return WIDGET_META.filter((m) => {
      if (m.id === "seats" && !ent.canManageSeats) return false;
      if (m.id === "upgrade" && ent.canManageSeats) return false;
      return true;
    });
  }, [ent.canManageSeats]);

  const availableWidgets = useMemo(() => new Set<string>([
    ...(ent.canViewSlateDropWidget ? ["slatedrop"] : []),
    "location",
    "data-usage", "processing", "financial", "calendar", "weather", "continue", "contacts", "suggest",
    ...(ent.canManageSeats ? ["seats"] : ["upgrade"]),
  ]), [ent.canViewSlateDropWidget, ent.canManageSeats]);

  return {
    widgetPrefs, setWidgetPrefs,
    prefsDirty, setPrefsDirty,
    prefsSaving,
    dashDragIdx,
    drawerMeta,
    availableWidgets,
    toggleVisible,
    setWidgetSize,
    moveWidget,
    savePrefs,
    resetPrefs,
    handleDashDragStart,
    handleDashDragOver,
    handleDashDragEnd,
  };
}
