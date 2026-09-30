"use client";

import { useState } from "react";
import type { RedactionMode, SharePolicy, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";

type Draft = { t: number; yaw: number; pitch: number };

type Props = {
  clipId: string;
  walkthroughId: string;
  draft: Draft | null;
  waypoints: WaypointRecord[];
  rules: RedactionRule[];
  onRefresh: () => void;
};

export function PrivacyRulesPanel({ clipId, walkthroughId, draft, waypoints, rules, onRefresh }: Props) {
  const [mode, setMode] = useState<RedactionMode>("skip");
  const [policy, setPolicy] = useState<SharePolicy>("public");
  const [tEnd, setTEnd] = useState("");
  const [yawMax, setYawMax] = useState("");
  const [pitchMin, setPitchMin] = useState("-40");
  const [pitchMax, setPitchMax] = useState("10");
  const [waypointId, setWaypointId] = useState("");
  const [reason, setReason] = useState("");

  const add = async () => {
    if (!clipId || !draft) return;
    const end = Number(tEnd);
    const payload: Record<string, unknown> = {
      clipId,
      tStart: draft.t,
      tEnd: mode === "hide-waypoint" ? draft.t + 0.05 : end,
      mode,
      policy,
      reason: reason || null,
    };
    if (mode === "cover" || mode === "panel" || mode === "solid") {
      payload.yawMin = draft.yaw - 20;
      payload.yawMax = Number(yawMax) || draft.yaw + 20;
      payload.pitchMin = Number(pitchMin);
      payload.pitchMax = Number(pitchMax);
    }
    if (mode === "hide-waypoint") {
      payload.waypointId = waypointId;
      payload.tEnd = draft.t + 0.1;
    }
    await fetch(`/api/spatial-walkthrough/${walkthroughId}/redactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    onRefresh();
  };

  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Sensitive area rules</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={mode} onChange={(e) => setMode(e.target.value as RedactionMode)} className="h-11 border border-white/10 bg-transparent px-2">
          <option value="skip">Skip time interval</option>
          <option value="cover">Cover spherical sector</option>
          <option value="panel">Privacy panel</option>
          <option value="hide-waypoint">Hide waypoint</option>
        </select>
        <select value={policy} onChange={(e) => setPolicy(e.target.value as SharePolicy)} className="h-11 border border-white/10 bg-transparent px-2">
          <option value="client">Applies to CLIENT</option>
          <option value="public">Applies to PUBLIC (+ client)</option>
        </select>
      </div>
      {mode !== "hide-waypoint" ? (
        <input value={tEnd} onChange={(e) => setTEnd(e.target.value)} placeholder="End time (seconds)" className="h-11 w-full border border-white/10 bg-transparent px-3" />
      ) : (
        <select value={waypointId} onChange={(e) => setWaypointId(e.target.value)} className="h-11 w-full border border-white/10 bg-transparent px-2">
          <option value="">Select waypoint to hide</option>
          {waypoints.map((w) => (
            <option key={w.id} value={w.id}>{w.label || w.id} @ {w.tSeconds.toFixed(1)}s</option>
          ))}
        </select>
      )}
      {mode === "cover" || mode === "panel" ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={yawMax} onChange={(e) => setYawMax(e.target.value)} placeholder="Yaw max (seam-safe)" className="h-11 border border-white/10 bg-transparent px-3" />
          <input value={pitchMin} onChange={(e) => setPitchMin(e.target.value)} placeholder="Pitch min" className="h-11 border border-white/10 bg-transparent px-3" />
          <input value={pitchMax} onChange={(e) => setPitchMax(e.target.value)} placeholder="Pitch max" className="h-11 border border-white/10 bg-transparent px-3" />
        </div>
      ) : null}
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Internal reason (omitted from PUBLIC export)" className="h-11 w-full border border-white/10 bg-transparent px-3" />
      <button type="button" onClick={() => void add()} className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]">
        Add rule from pause position
      </button>
      <ul className="space-y-1 text-sm text-[var(--graphite-muted)]">
        {rules.map((r) => (
          <li key={`${r.clipId}-${r.tStart}-${r.mode}-${r.reason ?? ""}`} className="flex items-center justify-between gap-2">
            <span>{r.mode} · {r.policy} · {r.tStart.toFixed(1)}–{r.tEnd.toFixed(1)}s</span>
            {r.id ? (
              <button
                type="button"
                className="text-[var(--graphite-primary)]"
                onClick={async () => {
                  await fetch(`/api/spatial-walkthrough/${walkthroughId}/redactions?id=${r.id}`, { method: "DELETE" });
                  onRefresh();
                }}
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
