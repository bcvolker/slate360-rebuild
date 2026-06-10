import L from "leaflet";
import { PLAN_PIN_MARKER } from "@/lib/capture-v2/plan-pin-marker-tokens";

type PinIconArgs = {
  label: string;
  currentSession: boolean;
  captured: boolean;
  xPct: number;
  yPct: number;
};

export function createPlanPinMarkerIcon({ label, currentSession, captured, xPct, yPct }: PinIconArgs): L.DivIcon {
  const fill = currentSession ? PLAN_PIN_MARKER.sessionFill : PLAN_PIN_MARKER.foreignFill;
  const border = currentSession ? PLAN_PIN_MARKER.sessionBorder : PLAN_PIN_MARKER.foreignBorder;
  const text = currentSession ? PLAN_PIN_MARKER.sessionText : PLAN_PIN_MARKER.foreignText;
  const ring = captured && currentSession ? `box-shadow:0 0 0 2px ${PLAN_PIN_MARKER.capturedRing};` : "";

  return L.divIcon({
    className: "",
    iconSize: [PLAN_PIN_MARKER.iconWidthPx, PLAN_PIN_MARKER.iconHeightPx],
    iconAnchor: [PLAN_PIN_MARKER.iconWidthPx / 2, PLAN_PIN_MARKER.iconHeightPx],
    html: `<div style="display:flex;flex-direction:column;align-items:center" data-plan-pin-marker="${currentSession ? "session" : "foreign"}" data-plan-pin-label="${label}" data-plan-pin-x-pct="${xPct.toFixed(3)}" data-plan-pin-y-pct="${yPct.toFixed(3)}"><div style="width:28px;height:28px;border-radius:50%;background:${fill};color:${text};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;border:2px solid ${border};${ring}">${label}</div><div style="width:2px;height:8px;background:${fill};border-radius:1px"></div></div>`,
  });
}
