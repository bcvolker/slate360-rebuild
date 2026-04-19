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
  { id: "slatedrop",  label: "SlateDrop",            icon: FolderOpen,   color: "#3B82F6" },
  { id: "location",   label: "Site Location",        icon: MapPin,       color: "#3B82F6" },
  { id: "data-usage", label: "Data Usage & Credits",  icon: CreditCard,   color: "#059669" },
  { id: "processing", label: "Processing Jobs",       icon: Cpu,          color: "#2563EB" },
  { id: "financial",  label: "Financial Snapshot",    icon: TrendingUp,   color: "#6366F1" },
  { id: "calendar",   label: "Calendar",             icon: CalendarIcon, color: "#DC2626" },
  { id: "weather",    label: "Weather",              icon: Cloud,        color: "#0891B2" },
  { id: "continue",   label: "Continue Working",     icon: Clock,        color: "#3B82F6" },
  { id: "contacts",   label: "Contacts",             icon: Users,        color: "#059669" },
  { id: "suggest",    label: "Suggest a Feature",    icon: Lightbulb,    color: "#7C3AED" },
  { id: "seats",      label: "Seat Management",      icon: Users,        color: "#6366F1", tierGate: "seats" },
  { id: "upgrade",    label: "Upgrade Card",         icon: Zap,          color: "#3B82F6", tierGate: "no-seats" },
];

/* ── Grid-span helper (consistent across dashboard & hub) ──── */

export function getWidgetSpan(id: string, size: WidgetSize): string {
  switch (size) {
    case "md":
      // Medium: spans 2 columns
      return "md:col-span-2";
    case "lg":
      // Large: spans full row (3 columns on xl)
      return "md:col-span-2 xl:col-span-3";
    case "sm":
    default:
      // Small / default: standard single column for all widgets
      return "";
  }
}

/** Height class for each size */
export function getWidgetHeight(size: WidgetSize): string {
  switch (size) {
    case "md":  return "h-[520px] min-h-[520px]";
    case "lg":  return "h-[calc(100vh-180px)] min-h-[600px]";
    case "sm":
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
