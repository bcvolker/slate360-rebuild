"use client";

import { useState } from "react";
import type { OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { reducePathStations, stationLabel } from "@/lib/spatial-walkthrough/path-stations";
import { COVERAGE_REQUIRED, fieldOfRegardAt, waypointHiddenByOperator } from "@/lib/spatial-walkthrough/field-of-regard";
import { operatorKeyframesFromRaw } from "@/lib/spatial-walkthrough/housewalk-operator";

type Props = {
  walkthroughId: string;
  clipId: string;
  waypoints: WaypointRecord[];
  patch: OperatorPatch;
  onRefresh: () => void;
  onAdd: () => void;
};

export function PathStationsPanel({ walkthroughId, clipId, waypoints, patch, onRefresh, onAdd }: Props) {
  const stations = reducePathStations(waypoints, clipId);
  const [label, setLabel] = useState<Record<string, string>>({});
  const [time, setTime] = useState<Record<string, string>>({});
  const keys = operatorKeyframesFromRaw(patch);

  const save = async (wp: WaypointRecord) => {
    await fetch(`/api/spatial-walkthrough/${walkthroughId}/waypoints`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: wp.id,
        label: label[wp.id] ?? wp.label,
        tSeconds: Number(time[wp.id] ?? wp.tSeconds),
      }),
    });
    onRefresh();
  };

  const remove = async (id: string) => {
    await fetch(`/api/spatial-walkthrough/${walkthroughId}/waypoints`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onRefresh();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-white">Path stations</p>
      <p className="text-xs text-[var(--graphite-muted)]">Shown in the sphere: {stations.length} of {waypoints.length}. HouseWalk waypoints are used automatically.</p>
      <button type="button" className="h-11 w-full border border-white/20 text-sm" onClick={onAdd}>Add station at playhead</button>
      {waypoints.map((wp) => {
        const hidden = waypointHiddenByOperator(wp.yawDeg, wp.pitchDeg, fieldOfRegardAt(wp.tSeconds, keys, patch));
        return (
          <div key={wp.id} className="space-y-1 border border-white/10 p-2">
            <p className="text-xs text-[var(--graphite-muted)]">{stationLabel(wp)}</p>
            <input className="h-11 w-full border border-white/10 bg-transparent px-2 text-sm" value={label[wp.id] ?? wp.label ?? ""} onChange={(e) => setLabel((s) => ({ ...s, [wp.id]: e.target.value }))} />
            <input className="h-11 w-full border border-white/10 bg-transparent px-2 text-sm" value={time[wp.id] ?? String(wp.tSeconds)} onChange={(e) => setTime((s) => ({ ...s, [wp.id]: e.target.value }))} />
            {hidden ? <p className="text-xs text-[var(--graphite-text-body)]">{COVERAGE_REQUIRED}</p> : null}
            <div className="flex gap-2">
              <button type="button" className="h-11 flex-1 border border-white/20 text-sm" onClick={() => void save(wp)}>Save</button>
              <button type="button" className="h-11 flex-1 text-sm" onClick={() => void remove(wp.id)}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
