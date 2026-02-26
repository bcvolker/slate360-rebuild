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

export interface WidgetPref {
  id: string;
  visible: boolean;
  /** When true the widget spans the full row */
  expanded: boolean;
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
  { id: "location",   label: "Location",             icon: MapPin,       color: "#1E3A8A" },
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

export function getWidgetSpan(id: string, expanded: boolean): string {
  if (id === "seats") return "md:col-span-2 xl:col-span-3";
  if (id === "calendar")
    return expanded
      ? "md:col-span-2 xl:col-span-3"
      : "md:col-span-2";
  return expanded ? "md:col-span-2 xl:col-span-3" : "";
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
    expanded: opts?.expandedIds
      ? opts.expandedIds.includes(m.id)
      : m.id === "calendar" || m.id === "seats",
    order: i,
  }));
}

/* ── Storage keys ────────────────────────────────────────────── */

export const DASHBOARD_STORAGE_KEY = "slate360-dashboard-widgets";
export const HUB_STORAGE_KEY      = "slate360-hub-widgets";
