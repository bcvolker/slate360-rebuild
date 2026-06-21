import L from "leaflet";
import { PLAN_PIN_MARKER } from "@/lib/capture-v2/plan-pin-marker-tokens";
import { resolvePlanPinTypeStyle } from "@/lib/capture-v2/plan-pin-type-tokens";
import type { SiteWalkItemType } from "@/lib/types/site-walk";

type PinIconArgs = {
  label: string;
  currentSession: boolean;
  captured: boolean;
  xPct: number;
  yPct: number;
  /** Attached item type — drives color + glyph (photo / 360 / file). */
  itemType?: SiteWalkItemType | null;
};

export function createPlanPinMarkerIcon({ label, currentSession, captured, xPct, yPct, itemType }: PinIconArgs): L.DivIcon {
  // Foreign pins (other sessions) stay muted. Current-session pins are colored by
  // the attached item type once captured; an uncaptured placement keeps the green
  // session look so nothing regresses for plain photo walks.
  const typeStyle = resolvePlanPinTypeStyle(captured ? itemType : "photo");
  const fill = currentSession ? typeStyle.fill : PLAN_PIN_MARKER.foreignFill;
  const border = currentSession ? typeStyle.border : PLAN_PIN_MARKER.foreignBorder;
  const text = currentSession ? typeStyle.text : PLAN_PIN_MARKER.foreignText;
  const ring = captured && currentSession ? `box-shadow:0 0 0 2px ${PLAN_PIN_MARKER.capturedRing};` : "";

  const badge =
    currentSession && captured && typeStyle.badgeSvg
      ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:${typeStyle.badgeBg};border:1.5px solid ${PLAN_PIN_MARKER.sessionText};display:flex;align-items:center;justify-content:center">${typeStyle.badgeSvg}</div>`
      : "";

  return L.divIcon({
    className: "",
    iconSize: [PLAN_PIN_MARKER.iconWidthPx, PLAN_PIN_MARKER.iconHeightPx],
    iconAnchor: [PLAN_PIN_MARKER.iconWidthPx / 2, PLAN_PIN_MARKER.iconHeightPx],
    html: `<div style="display:flex;flex-direction:column;align-items:center" data-plan-pin-marker="${currentSession ? "session" : "foreign"}" data-plan-pin-type="${captured ? itemType ?? "photo" : "empty"}" data-plan-pin-label="${label}" data-plan-pin-x-pct="${xPct.toFixed(3)}" data-plan-pin-y-pct="${yPct.toFixed(3)}"><div style="position:relative;width:28px;height:28px;border-radius:50%;background:${fill};color:${text};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;border:2px solid ${border};${ring}">${label}${badge}</div><div style="width:2px;height:8px;background:${fill};border-radius:1px"></div></div>`,
  });
}
