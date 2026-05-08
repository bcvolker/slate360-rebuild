import type { MutableRefObject } from "react";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { PlanViewerPin } from "./PlanPin";

export type Point = { x: number; y: number };
export type Transform = { scale: number; x: number; y: number };
export type QuickMenuState = { pinId?: string; xPct: number; yPct: number } | null;
export type PlanPage = { key: string; label: string; pageNumber: number; sheetId?: string };

export const PLAN_PDF_BASE_WIDTH = 1200;
export const PLAN_PDF_BASE_HEIGHT = 858;
export const MIN_PLAN_SCALE = 0.25;
export const MAX_PLAN_SCALE = 2.5;
export const PLAN_FIT_PADDING = 32;
export const PLAN_TOOLBAR_RESERVE = 148;
export const PLAN_BOTTOM_RESERVE = 112;

export function buildPages(planSet: SiteWalkPlanSet | null, sheets: SiteWalkPlanSheet[], pdfPageCount: number): PlanPage[] {
  if (!planSet) return [];
  const total = Math.max(planSet.page_count || 0, sheets.length, pdfPageCount, 1);
  return Array.from({ length: total }, (_, index) => {
    const pageNumber = index + 1;
    const sheet = sheets.find((item) => item.sheet_number === pageNumber);
    return { key: sheet?.id ?? `${planSet.id}-${pageNumber}`, label: sheet?.sheet_name ?? `Sheet ${pageNumber}`, pageNumber, sheetId: sheet?.id };
  });
}

export function buildPlanPin(point: Point, surface: HTMLDivElement | null, count: number, sessionId: string): PlanViewerPin | null {
  if (!surface) return null;
  const rect = surface.getBoundingClientRect();
  const xPct = clamp(((point.x - rect.left) / rect.width) * 100, 0, 100);
  const yPct = clamp(((point.y - rect.top) / rect.height) * 100, 0, 100);
  return { id: Math.random().toString(36).slice(2), x_pct: xPct, y_pct: yPct, session_id: sessionId, label: String(count).padStart(2, "0"), amber: true, item_id: null };
}

export function clearPressTimer(timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = null;
}

export function pointerDistance(points: Map<number, Point>) {
  const [first, second] = Array.from(points.values());
  if (!first || !second) return 1;
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
