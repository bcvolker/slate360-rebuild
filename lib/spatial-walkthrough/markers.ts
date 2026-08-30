import type { BrandTheme, OperatorPatch, WaypointRecord } from "./types";
import { activeSectors, sectorYawCenter, type RedactionRule } from "./redaction";
import { markerKindFromPinType, markerScaleFromPitch } from "./marker-scale";
import { operatorPatchActiveAt } from "./operator-patch";
import { interpolateKeyframes, keyframeToPatch, operatorRegions } from "./keyframes";
import { pathHudNodes } from "./path-hud";

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

function pathHtml(label: string, rank: number, opacity: number, scale: number, selected: boolean): string {
  const on = selected ? " is-selected" : "";
  const nearest = rank === 0 ? " sw-reticle" : "";
  return `<button type="button" class="sw-path sw-mark${nearest}${on}" data-rank="${rank}" style="--sw-path-opacity:${opacity};--sw-mark-scale:${scale}" aria-label="${esc(label)}"><span class="sw-path-stem"></span><span class="sw-path-chevron"></span><span class="sw-path-crumb"></span><span class="sw-mark-label">${esc(label)}</span></button>`;
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
}): ViewerMarkerDef[] {
  const { waypoints, clipId, t, pins, redactions, operatorPatch, theme, chrome = {}, selectedId, hudOpacity = 1 } = args;
  const list: ViewerMarkerDef[] = [];

  for (const node of pathHudNodes(waypoints, clipId, t, hudOpacity)) {
    const wp = node.waypoint;
    const label = wp.label ?? (node.rank === 0 ? "Continue along path" : "Further along path");
    const size = Math.round((node.rank === 0 ? 56 : 44) * node.scale);
    list.push({
      id: `wp-${wp.id}`,
      yawDeg: wp.yawDeg,
      pitchDeg: wp.pitchDeg,
      html: pathHtml(label, node.rank, node.opacity, node.scale, selectedId === wp.id),
      width: size,
      height: Math.round(size * 1.25),
      data: { kind: "waypoint", id: wp.id, t: wp.tSeconds, yaw: wp.yawDeg, pitch: wp.pitchDeg, rank: node.rank },
    });
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

  const livePatches = operatorRegions(redactions, operatorPatch)
    .map((region) => {
      const frame = interpolateKeyframes(region.frames, t);
      return frame ? keyframeToPatch(frame, operatorPatch) : null;
    })
    .filter((p): p is OperatorPatch => Boolean(p && operatorPatchActiveAt(p, t)));
  const patch = (livePatches[0] ?? operatorPatch) as PatchFields | null | undefined;
  if (patch && operatorPatchActiveAt(patch, t)) {
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
  }
  livePatches.forEach((live, i) => {
    const fields = live as PatchFields;
    const rearPitch = typeof fields.pitchMin === "number"
      ? (fields.pitchMin + (fields.pitchMax ?? fields.pitchMin)) / 2
      : -Math.round((fields.wrapY0Frac ?? 0.32) * 40);
    const rearYaw = typeof fields.rearYawCenter === "number" ? fields.rearYawCenter : 180;
    list.push({
      id: i === 0 ? "rear-patch" : `rear-patch-${i}`,
      yawDeg: rearYaw,
      pitchDeg: rearPitch,
      html: `<div class="sw-rear sw-patch-${fields.style ?? "solid"}" aria-hidden="true"></div>`,
      width: Math.round(140 + (fields.rearYawWidth ?? (fields.wrapFrac ?? 0.09) * 360)),
      height: Math.round(80 + Math.abs((fields.pitchMax ?? 0) - (fields.pitchMin ?? -40))),
      data: { kind: "patch" },
    });
  });

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
