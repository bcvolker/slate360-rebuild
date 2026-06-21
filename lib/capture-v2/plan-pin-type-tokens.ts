/**
 * Plan-pin appearance by attached item type (color + glyph), for "walks with
 * drawings". A pin on the drawing must show *what's behind it* at a glance:
 *   - photo          → green camera (default)
 *   - photo_360      → blue sphere/globe
 *   - file_attachment→ steel paperclip (invoice / proposal / PDF)
 * Anything else (video, notes, empty placement) falls back to the photo look so
 * existing pins are unaffected. Colors are raw hex (the Leaflet marker is an
 * injected HTML divIcon, not CSS classes) but mirror the Graphite Glass tokens.
 */

import type { SiteWalkItemType } from "@/lib/types/site-walk";

export type PlanPinTypeStyle = {
  /** Circle fill for a current-session pin of this type. */
  fill: string;
  border: string;
  text: string;
  /** 14px corner badge SVG (white stroke), or null for the clean default photo pin. */
  badgeSvg: string | null;
  badgeBg: string;
};

const GREEN = "#00E699";
const GREEN_BORDER = "#00c985";
const BLUE = "#3D8EFF";
const BLUE_BORDER = "#2f6fd6";
const STEEL = "#94A3B8";
const STEEL_BORDER = "#6b7a90";
const CANVAS_TEXT = "#0B0F15";
const LIGHT_TEXT = "#0B0F15";

// 16x16, white stroke — globe (360) and paperclip (file). Kept tiny + recognizable.
const SPHERE_SVG =
  '<svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><ellipse cx="8" cy="8" rx="2.6" ry="6"/><path d="M2 8h12"/></svg>';
const PAPERCLIP_SVG =
  '<svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7.5l-5.4 5.4a3 3 0 0 1-4.2-4.2l5.7-5.7a2 2 0 0 1 2.8 2.8l-5.7 5.7a1 1 0 0 1-1.4-1.4l5-5"/></svg>';

export function resolvePlanPinTypeStyle(itemType: SiteWalkItemType | null | undefined): PlanPinTypeStyle {
  switch (itemType) {
    case "photo_360":
      return { fill: BLUE, border: BLUE_BORDER, text: "#fff", badgeSvg: SPHERE_SVG, badgeBg: BLUE_BORDER };
    case "file_attachment":
      return { fill: STEEL, border: STEEL_BORDER, text: LIGHT_TEXT, badgeSvg: PAPERCLIP_SVG, badgeBg: STEEL_BORDER };
    case "photo":
    default:
      return { fill: GREEN, border: GREEN_BORDER, text: CANVAS_TEXT, badgeSvg: null, badgeBg: GREEN_BORDER };
  }
}
