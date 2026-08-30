"use client";

import type { CSSProperties } from "react";
import type { BrandTheme, OperatorPatch, PinType, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { markerKindFromPinType, markerScaleFromPitch } from "@/lib/spatial-walkthrough/marker-scale";

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
  onSelect?: (id: string) => void;
};

function place(yaw: number, pitch: number): CSSProperties {
  return {
    left: `${50 + (yaw / 180) * 38}%`,
    top: `${52 - (pitch / 90) * 36}%`,
  };
}

export function PreviewSphere({ theme, title, capturedAt, waypoints, pins, operatorPatch, selectedId, onSelect }: Props) {
  const next = waypoints[1] ?? waypoints[0];
  const date = capturedAt ? new Date(capturedAt).toLocaleDateString() : "";
  return (
    <div className="sw-preview-sphere" style={{ "--sw-accent": theme.accentColor } as CSSProperties}>
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
      {next ? (
        <button
          type="button"
          className="sw-preview-mark"
          style={place(next.yawDeg, next.pitchDeg)}
          onClick={() => onSelect?.(next.id)}
          aria-label={next.label ?? "Waypoint"}
        >
          <Mark kind="waypoint" label={next.label ?? "Station"} selected={selectedId === next.id} scale={markerScaleFromPitch(next.pitchDeg)} />
        </button>
      ) : null}
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
