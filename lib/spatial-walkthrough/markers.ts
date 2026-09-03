import type { BrandTheme, OperatorPatch, WaypointRecord } from "./types";
import { activeSectors, sectorYawCenter, type RedactionRule } from "./redaction";
import { markerKindFromPinType, markerScaleFromPitch } from "./marker-scale";
import { operatorPatchActiveAt } from "./operator-patch";
import { pathHudNodes } from "./path-hud";
import { stationLabel, stationName } from "./path-stations";

type PatchFields = OperatorPatch & {
  nadirRadius?: number;
  nadirFrac?: number;
  rearYawCenter?: number;
  rearYawWidth?: number;
  pitchMin?: number;
  pitchMax?: number;
  wrapFrac?: number;
  wrapY0Frac?: number;
  style?: string;
  fill?: string;
  showCompass?: boolean;
  headingDeg?: number | null;
};

export type PinMarkerInput = {
  id: string;
  yawDeg: number;
  pitchDeg: number;
  label: string;
  pinType?: string;
};

export type ViewerMarkerDef = {
  id: string;
  yawDeg: number;
  pitchDeg: number;
  html: string;
  width: number;
  height: number;
  data: Record<string, unknown>;
};

export type MarkerChrome = {
  title?: string;
  capturedAt?: string | null;
  logoUrl?: string | null;
};

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}

function markHtml(kind: string, label: string, selected: boolean, scale: number): string {
  const on = selected ? " is-selected" : "";
  return `<button type="button" class="sw-reticle sw-pin sw-mark sw-mark--${esc(kind)}${on}" style="--sw-mark-scale:${scale}" aria-label="${esc(label)}"><span class="sw-mark-leader"></span><span class="sw-mark-core sw-reticle-ring sw-pin-core"></span><span class="sw-mark-label">${esc(label)}</span></button>`;
}

function nadirPx(patch: PatchFields): number {
  const radius = typeof patch.nadirRadius === "number" ? patch.nadirRadius : (patch.nadirFrac ?? 0.22);
  return Math.round(180 + radius * 280);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
}

function nadirPlateHtml(patch: PatchFields, chrome: MarkerChrome, theme?: BrandTheme | null): string {
  const fill = patch.fill === "brand" ? "brand" : "neutral";
  const title = esc(chrome.title ?? "");
  const date = patch.showDate ? esc(formatDate(chrome.capturedAt)) : "";
  const logo = patch.logoInPatch && (chrome.logoUrl || theme?.logoUrl)
    ? `<img src="${esc(chrome.logoUrl || theme?.logoUrl || "")}" alt="" />`
    : "";
  const compass = patch.showCompass
    ? `<span class="sw-nadir-compass">${patch.headingDeg != null ? `N ${Math.round(patch.headingDeg)}` : "N"}</span>`
    : "";
  return `<div class="sw-nadir sw-nadir-plate sw-nadir--${fill} sw-patch-${patch.style ?? "solid"}" aria-hidden="true">${logo}<span>${title}</span>${date ? `<span>${date}</span>` : ""}${compass}</div>`;
}

export function buildViewerMarkers(args: {
  waypoints: WaypointRecord[];
  clipId: string;
  t: number;
  pins: PinMarkerInput[];
  redactions: RedactionRule[];
  operatorPatch?: OperatorPatch | null;
  theme?: BrandTheme | null;
  chrome?: MarkerChrome;
  selectedId?: string | null;
  hudOpacity?: number;
  showOperatorOverlay?: boolean;
}): ViewerMarkerDef[] {
  const { waypoints, clipId, t, pins, redactions, operatorPatch, theme, chrome = {}, selectedId } = args;
  const list: ViewerMarkerDef[] = [];
  const hud = args.hudOpacity ?? 1;

  if (hud > 0) {
    for (const node of pathHudNodes(waypoints, clipId, t, hud)) {
      const label = stationLabel(node.waypoint);
      list.push({
        id: `path-${node.waypoint.id}`,
        yawDeg: node.waypoint.yawDeg,
        pitchDeg: Math.max(node.waypoint.pitchDeg, 20),
        html: `<button type="button" class="sw-path-station" data-rank="${node.rank}" style="opacity:${node.opacity}" aria-label="${esc(label)}"><span class="sw-path-stem"></span><span class="sw-path-disc"></span><span class="sw-path-name">${esc(stationName(node.waypoint))}</span><span class="sw-path-label">${esc(label)}</span></button>`,
        width: Math.round(96 * node.scale),
        height: Math.round(80 * node.scale),
        data: { kind: "waypoint", id: node.waypoint.id, t: node.waypoint.tSeconds, yaw: node.waypoint.yawDeg, pitch: node.waypoint.pitchDeg },
      });
    }
  }

  for (const pin of pins) {
    const kind = markerKindFromPinType(pin.pinType);
    const scale = markerScaleFromPitch(pin.pitchDeg);
    list.push({
      id: `pin-${pin.id}`,
      yawDeg: pin.yawDeg,
      pitchDeg: pin.pitchDeg,
      html: markHtml(kind, pin.label, selectedId === pin.id, scale),
      width: Math.round(48 * scale),
      height: Math.round(60 * scale),
      data: { kind: "pin", id: pin.id },
    });
  }

  const patch = operatorPatch as PatchFields | null | undefined;
  if (args.showOperatorOverlay !== false && patch && operatorPatchActiveAt(patch, t)) {
    const size = nadirPx(patch);
    list.push({
      id: "nadir-patch",
      yawDeg: 0,
      pitchDeg: -90,
      html: nadirPlateHtml(patch, chrome, theme),
      width: size,
      height: size,
      data: { kind: "patch" },
    });
    const rearPitch = typeof patch.pitchMin === "number"
      ? (patch.pitchMin + (patch.pitchMax ?? patch.pitchMin)) / 2
      : -Math.round((patch.wrapY0Frac ?? 0.32) * 40);
    const rearYaw = typeof patch.rearYawCenter === "number" ? patch.rearYawCenter : 180;
    list.push({
      id: "rear-patch",
      yawDeg: rearYaw,
      pitchDeg: rearPitch,
      html: `<div class="sw-rear sw-patch-${patch.style ?? "solid"}" aria-hidden="true"></div>`,
      width: Math.round(140 + (patch.rearYawWidth ?? (patch.wrapFrac ?? 0.09) * 360)),
      height: Math.round(80 + Math.abs((patch.pitchMax ?? 0) - (patch.pitchMin ?? -40))),
      data: { kind: "patch" },
    });
  }

  for (const mode of ["solid", "cover", "panel"] as const) {
    for (const s of activeSectors(redactions, clipId, t, mode)) {
      const yaw = s.yawMin != null && s.yawMax != null ? sectorYawCenter(s.yawMin, s.yawMax) : 0;
      const pitch = ((s.pitchMin ?? 0) + (s.pitchMax ?? 0)) / 2;
      list.push({
        id: `${mode}-${s.tStart}-${s.tEnd}-${s.yawMin ?? 0}`,
        yawDeg: yaw,
        pitchDeg: pitch,
        html: `<div class="sw-privacy" aria-hidden="true">Private</div>`,
        width: mode === "panel" ? 260 : 200,
        height: mode === "panel" ? 160 : 120,
        data: { kind: "privacy" },
      });
    }
  }

  return list;
}
