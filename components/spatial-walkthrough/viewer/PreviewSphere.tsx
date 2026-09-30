"use client";

import type { CSSProperties } from "react";
import type { BrandTheme, OperatorPatch, PinType, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { markerKindFromPinType, markerScaleFromPitch } from "@/lib/spatial-walkthrough/marker-scale";
import { pathHudNodes } from "@/lib/spatial-walkthrough/path-hud";

type Pin = {
  id: string;
  label: string;
  pinType: PinType | string;
  yawDeg: number;
  pitchDeg: number;
};

type Props = {
  theme: BrandTheme;
  title: string;
  capturedAt?: string | null;
  waypoints: WaypointRecord[];
  pins: Pin[];
  operatorPatch?: OperatorPatch | null;
  selectedId?: string | null;
  clipId?: string;
  currentT?: number;
  hudOpacity?: number;
  onSelect?: (id: string) => void;
  onWaypoint?: () => void;
};

function place(yaw: number, pitch: number): CSSProperties {
  return {
    left: `${50 + (yaw / 180) * 38}%`,
    top: `${52 - (pitch / 90) * 36}%`,
  };
}

export function PreviewSphere({
  theme,
  title,
  capturedAt,
  waypoints,
  pins,
  operatorPatch,
  selectedId,
  clipId,
  currentT = 0,
  hudOpacity = 1,
  onSelect,
  onWaypoint,
}: Props) {
  const path = pathHudNodes(waypoints, clipId || waypoints[0]?.clipId || "", currentT, hudOpacity);
  const date = capturedAt ? new Date(capturedAt).toLocaleDateString() : "";
  return (
    <div className="sw-preview-sphere" style={{ "--sw-accent": theme.accentColor } as CSSProperties} data-path-hud>
      <div className="sw-preview-grid" />
      {operatorPatch?.enabled ? (
        <div className={`sw-nadir-plate sw-nadir sw-nadir--${operatorPatch.fill ?? "neutral"}`} aria-hidden>
          {operatorPatch.logoInPatch && theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={theme.logoUrl} alt="" />
          ) : null}
          <span>{title}</span>
          {operatorPatch.showDate && date ? <span>{date}</span> : null}
          {operatorPatch.showCompass ? <span className="sw-nadir-compass">N</span> : null}
        </div>
      ) : null}
      {path.map((node) => (
        <button
          key={node.waypoint.id}
          type="button"
          className="sw-preview-mark"
          style={{ ...place(node.waypoint.yawDeg, node.waypoint.pitchDeg), "--sw-path-opacity": node.opacity } as CSSProperties}
          onClick={() => {
            onWaypoint?.();
            onSelect?.(node.waypoint.id);
          }}
          aria-label={node.waypoint.label ?? "Path station"}
        >
          <span
            className={`sw-path sw-mark${node.rank === 0 ? " sw-reticle" : ""}${selectedId === node.waypoint.id ? " is-selected" : ""}`}
            data-rank={node.rank}
            style={{ "--sw-mark-scale": node.scale } as CSSProperties}
          >
            <span className="sw-path-stem" />
            <span className="sw-path-chevron" />
            <span className="sw-path-crumb" />
            <span className="sw-mark-label">{node.waypoint.label ?? "Station"}</span>
          </span>
        </button>
      ))}
      {pins.map((pin) => (
        <button
          key={pin.id}
          type="button"
          className="sw-preview-mark"
          style={place(pin.yawDeg, pin.pitchDeg)}
          onClick={() => onSelect?.(pin.id)}
          aria-label={pin.label}
        >
          <Mark
            kind={markerKindFromPinType(pin.pinType)}
            label={pin.label}
            selected={selectedId === pin.id}
            scale={markerScaleFromPitch(pin.pitchDeg)}
          />
        </button>
      ))}
    </div>
  );
}

function Mark({ kind, label, selected, scale }: { kind: string; label: string; selected: boolean; scale: number }) {
  return (
    <span className={`sw-mark sw-mark--${kind}${selected ? " is-selected" : ""}`} style={{ "--sw-mark-scale": scale } as CSSProperties}>
      <span className="sw-mark-leader" />
      <span className="sw-mark-core" />
      <span className="sw-mark-label">{label}</span>
    </span>
  );
}
