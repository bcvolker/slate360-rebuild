"use client";

import { useCallback, useEffect, useState } from "react";
import { useEditorStore } from "./editor-store";
import { isNeutral } from "@/lib/content-studio/color";

export type RenderJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  stage: string | null;
  progressPct: number;
  estimatedCredits: number;
  errorText: string | null;
  createdAt: string;
  completedAt: string | null;
  aspect: string | null;
  downloadUrl: string | null;
};

export type RenderOutput = { aspect: string; width: number; height: number; quality: string; fps: number };

/** Poll the render-jobs list; auto-polls while any job is active. */
export function useRenderJobs() {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const refetch = useCallback(async () => {
    try {
      const r = await fetch("/api/content-studio/render");
      if (!r.ok) return;
      const j = await r.json();
      setJobs(j.jobs ?? j.data?.jobs ?? []);
    } catch {
      /* harness / unauth — ignore */
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  useEffect(() => {
    if (!jobs.some((j) => j.status === "queued" || j.status === "processing")) return;
    const t = setInterval(refetch, 2500);
    return () => clearInterval(t);
  }, [jobs, refetch]);

  return { jobs, refetch };
}

/** Enqueue a render of the current timeline. Returns { ok, error }. */
export async function enqueueRender(output: RenderOutput): Promise<{ ok: boolean; error?: string }> {
  const { clips, editProjectId, masterColor, clipColor } = useEditorStore.getState();
  if (clips.length === 0) return { ok: false, error: "Add at least one clip to the timeline." };
  const body = {
    editProjectId,
    clips: clips.map((c) => {
      const eff = clipColor[c.id] ?? masterColor;
      return {
        assetId: c.assetId,
        trimInSec: c.trimInSec,
        trimOutSec: c.trimOutSec,
        speedFactor: c.speedFactor,
        reversed: c.reversed,
        color: isNeutral(eff) ? undefined : eff,
      };
    }),
    output,
  };
  try {
    const res = await fetch("/api/content-studio/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, error: `Render request failed (${res.status}).` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error." };
  }
}
