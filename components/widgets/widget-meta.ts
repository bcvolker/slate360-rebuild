/**
 * ═══════════════════════════════════════════════════════════════
 * Shared Widget Metadata — SINGLE SOURCE OF TRUTH
 * Both DashboardClient and ProjectHub import from here.
 * ═══════════════════════════════════════════════════════════════
 */

import {
  FolderOpen,
  MapPin,
  CreditCard,
  Cpu,
  TrendingUp,
  Calendar as CalendarIcon,
  Cloud,
  Clock,
  Users,
  Lightbulb,
  Zap,
  type LucideIcon,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────────── */

export type WidgetSize = "default" | "sm" | "md" | "lg";

export interface WidgetPref {
  id: string;
  visible: boolean;
  /** Widget display size */
  size: WidgetSize;
  /** @deprecated — kept for migration only; use `size` instead */
  expanded?: boolean;
  order: number;
}

export interface WidgetMeta {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  /** "seats" = only for seat-tier users, "no-seats" = only for non-seat-tier */
  tierGate?: string;
}

/* ── Canonical widget list (12 entries) ──────────────────────── */

export const WIDGET_META: WidgetMeta[] = [
  { id: "slatedrop",  label: "SlateDrop",            icon: FolderOpen,   color: "#FF4D00" },
  { id: "location",   label: "Site Location",        icon: MapPin,       color: "#1E3A8A" },
  { id: "data-usage", label: "Data Usage & Credits",  icon: CreditCard,   color: "#059669" },
  { id: "processing", label: "Processing Jobs",       icon: Cpu,          color: "#D97706" },
  { id: "financial",  label: "Financial Snapshot",    icon: TrendingUp,   color: "#1E3A8A" },
  { id: "calendar",   label: "Calendar",             icon: CalendarIcon, color: "#DC2626" },
  { id: "weather",    label: "Weather",              icon: Cloud,        color: "#0891B2" },
  { id: "continue",   label: "Continue Working",     icon: Clock,        color: "#FF4D00" },
  { id: "contacts",   label: "Contacts",             icon: Users,        color: "#059669" },
  { id: "suggest",    label: "Suggest a Feature",    icon: Lightbulb,    color: "#7C3AED" },
  { id: "seats",      label: "Seat Management",      icon: Users,        color: "#1E3A8A", tierGate: "seats" },
  { id: "upgrade",    label: "Upgrade Card",         icon: Zap,          color: "#FF4D00", tierGate: "no-seats" },
];

/* ── Grid-span helper (consistent across dashboard & hub) ──── */

export function getWidgetSpan(id: string, size: WidgetSize): string {
  switch (size) {
    case "sm":
      // Small square: spans 1 column (same as default but taller)
      return "";
    case "md":
      // Medium square: spans 2 columns
      return "md:col-span-2";
    case "lg":
      // Large: spans full row (3 columns on xl)
      return "md:col-span-2 xl:col-span-3";
    default:
      // Default: standard single column
      if (id === "seats") return "md:col-span-2 xl:col-span-3";
      return "";
  }
}

/** Height class for each size */
export function getWidgetHeight(size: WidgetSize): string {
  switch (size) {
    case "sm":  return "h-[420px] min-h-[420px]";
    case "md":  return "h-[520px] min-h-[520px]";
    case "lg":  return "h-[calc(100vh-180px)] min-h-[600px]";
    default:    return "h-[320px] min-h-[320px]";
  }
}

/** Human-readable label */
export function getWidgetSizeLabel(size: WidgetSize): string {
  switch (size) {
    case "sm":  return "Small";
    case "md":  return "Medium";
    case "lg":  return "Large";
    default:    return "Default";
  }
}

/* ── Default-pref builder ────────────────────────────────────── */

export function buildDefaultPrefs(opts?: {
  visibleOnly?: string[];
  expandedIds?: string[];
}): WidgetPref[] {
  return WIDGET_META.map((m, i) => ({
    id: m.id,
    visible: opts?.visibleOnly
      ? opts.visibleOnly.includes(m.id)
      : true,
    size: (opts?.expandedIds?.includes(m.id) ? "md" : "default") as WidgetSize,
    order: i,
  }));
}

/* ── Storage keys ────────────────────────────────────────────── */

export const DASHBOARD_STORAGE_KEY = "slate360-dashboard-widgets";
export const HUB_STORAGE_KEY      = "slate360-hub-widgets";
