"use client";

import { useEffect, useState } from "react";
import { ChapterWalkthroughExperience } from "@/components/spatial-walkthrough/viewer/ChapterWalkthroughExperience";
import { type ExperiencePin } from "@/components/spatial-walkthrough/viewer/WalkthroughExperience";
import { parseOperatorPatch } from "@/lib/spatial-walkthrough/operator-patch";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";
import { toWaypoint } from "@/lib/spatial-walkthrough/waypoints";
import { toChapter } from "@/lib/spatial-walkthrough/chapters";
import { toClipEdge, type ClipSummary } from "@/lib/spatial-walkthrough/clip-edges";
import { parseShareLocator } from "@/lib/spatial-walkthrough/share-locator";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";

type Props = { walkthroughId: string };

function clipSummaries(walkthroughId: string, clips: Array<Record<string, unknown>>): ClipSummary[] {
  return clips.filter((c) => c.status === "ready").map((c, i) => ({
    id: String(c.id),
    title: (c.title as string) ?? null,
    zone: (c.zone as string) ?? null,
    durationS: Number(c.duration_s ?? 0),
    defaultYaw: Number(c.default_yaw ?? 0),
    defaultPitch: Number(c.default_pitch ?? 0),
    sortOrder: Number(c.sort_order ?? i),
    videoUrl: `/api/spatial-walkthrough/${walkthroughId}/media?clip=${c.id}&kind=proxy`,
    posterUrl: `/api/spatial-walkthrough/${walkthroughId}/media?clip=${c.id}&kind=poster`,
  }));
}

export function WalkthroughClientView({ walkthroughId }: Props) {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void fetch(`/api/spatial-walkthrough/${walkthroughId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setPayload);
  }, [walkthroughId]);

  if (!payload?.walkthrough) {
    return <p className="p-6 text-sm text-[var(--graphite-muted)]">Loading walkthrough…</p>;
  }

  const walkthrough = payload.walkthrough as Record<string, unknown>;
  const clips = (payload.clips as Array<Record<string, unknown>>) ?? [];
  const clip = clips.find((c) => c.status === "ready");
  if (!clip) {
    return <p className="p-6 text-sm text-[var(--graphite-muted)]">This walkthrough is still processing.</p>;
  }
  const clipId = String(clip.id);
  const pins = ((payload.pins as Array<Record<string, unknown>>) ?? []).map((p) => ({
    id: String(p.id),
    label: String(p.label),
    pinType: String(p.pin_type),
    body: (p.body as string) ?? null,
    yawDeg: Number(p.yaw_deg ?? 0),
    pitchDeg: Number(p.pitch_deg ?? 0),
    tSeconds: p.t_seconds == null ? null : Number(p.t_seconds),
    clipId: p.clip_id ? String(p.clip_id) : null,
    attachments: ((payload.attachments as Array<Record<string, unknown>>) ?? [])
      .filter((a) => String(a.pin_id) === String(p.id))
      .map((a) => ({
        id: String(a.id),
        kind: a.kind === "url" ? "url" as const : "slatedrop" as const,
        title: (a.title as string) ?? null,
        url: (a.external_url as string) ?? null,
        previewUrl: a.slatedrop_id ? `/api/slatedrop/download?fileId=${a.slatedrop_id}&mode=preview` : null,
        downloadUrl: a.slatedrop_id ? `/api/slatedrop/download?fileId=${a.slatedrop_id}` : null,
        fileName: (a.title as string) ?? null,
      })),
  })) as ExperiencePin[];
  const redactions = ((payload.redactions as Array<Record<string, unknown>>) ?? []).map((row) => ({
    clipId: String(row.clip_id),
    tStart: Number(row.t_start),
    tEnd: Number(row.t_end),
    yawMin: row.yaw_min == null ? null : Number(row.yaw_min),
    yawMax: row.yaw_max == null ? null : Number(row.yaw_max),
    pitchMin: row.pitch_min == null ? null : Number(row.pitch_min),
    pitchMax: row.pitch_max == null ? null : Number(row.pitch_max),
    mode: row.mode,
    policy: row.policy,
    reason: row.reason,
  })) as RedactionRule[];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-end gap-3 px-4 py-2">
        <a href={`/api/spatial-walkthrough/${walkthroughId}/export`} className="text-sm text-[var(--graphite-primary)]">
          Export
        </a>
      </div>
      <div className="min-h-[70vh] flex-1">
        <ChapterWalkthroughExperience
          theme={resolveBrandTheme({ walkthrough: walkthrough.brand_theme as never, canHidePoweredBy: true })}
          title={String(walkthrough.title)}
          videoUrl={`/api/spatial-walkthrough/${walkthroughId}/media?clip=${clipId}&kind=proxy`}
          posterUrl={`/api/spatial-walkthrough/${walkthroughId}/media?clip=${clipId}&kind=poster`}
          clipId={clipId}
          duration={Number(clip.duration_s ?? 0)}
          capturedAt={typeof walkthrough.captured_at === "string" ? walkthrough.captured_at : null}
          waypoints={((payload.waypoints as Array<Record<string, unknown>>) ?? []).map(toWaypoint)}
          pins={pins}
          redactions={redactions}
          operatorPatch={parseOperatorPatch(walkthrough.operator_patch)}
          walkthroughId={walkthroughId}
          clips={clipSummaries(walkthroughId, clips)}
          chapters={((payload.chapters as Array<Record<string, unknown>>) ?? []).map(toChapter)}
          edges={((payload.edges as Array<Record<string, unknown>>) ?? []).map(toClipEdge)}
          locator={typeof window !== "undefined" ? parseShareLocator(window.location.search) : undefined}
          shareBasePath={typeof window !== "undefined" ? window.location.pathname : undefined}
        />
      </div>
    </div>
  );
}
