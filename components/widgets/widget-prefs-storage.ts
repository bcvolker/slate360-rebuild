import type { WidgetPref, WidgetSize } from "@/components/widgets/widget-meta";

export const WIDGET_PREFS_SCHEMA_VERSION = 3;

type StoredWidgetPrefs = {
  version: number;
  prefs: WidgetPref[];
};

export function mergeWidgetPrefs(defaults: WidgetPref[], incoming: WidgetPref[]): WidgetPref[] {
  return defaults.map((def) => {
    const found = incoming.find((entry) => entry.id === def.id);
    if (!found) return def;
    // Migrate old `expanded` boolean → new `size` field
    let size: WidgetSize = (found as any).size ?? "default";
    if (!("size" in found) && typeof (found as any).expanded === "boolean") {
      size = (found as any).expanded ? "md" : "default";
    }
    return {
      ...def,
      visible: !!found.visible,
      size,
      order: typeof found.order === "number" ? found.order : def.order,
    };
  });
}

export function loadWidgetPrefs(storageKey: string, defaults: WidgetPref[]): WidgetPref[] {
  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as StoredWidgetPrefs | WidgetPref[] | string[];

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      (parsed as StoredWidgetPrefs).version === WIDGET_PREFS_SCHEMA_VERSION &&
      Array.isArray((parsed as StoredWidgetPrefs).prefs)
    ) {
      return mergeWidgetPrefs(defaults, (parsed as StoredWidgetPrefs).prefs);
    }
  } catch {
    return defaults;
  }

  return defaults;
}

export function saveWidgetPrefs(storageKey: string, prefs: WidgetPref[]): void {
  if (typeof window === "undefined") return;
  const payload: StoredWidgetPrefs = {
    version: WIDGET_PREFS_SCHEMA_VERSION,
    prefs,
  };
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // ignore local storage write failures
  }
}
