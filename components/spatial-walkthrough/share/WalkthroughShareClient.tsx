"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandTheme, OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import { WalkthroughExperience, type ExperiencePin } from "@/components/spatial-walkthrough/viewer/WalkthroughExperience";
import { SharePasswordGate } from "./SharePasswordGate";

type SharePayload = {
  theme: BrandTheme;
  operatorPatch: OperatorPatch | null;
  allowDownload: boolean;
  policy?: string;
  walkthrough: { id?: string; title: string; capturedAt?: string | null; building?: string | null };
  clip: { id: string; proxyUrl: string; posterUrl: string | null } | null;
  waypoints: WaypointRecord[];
  pins: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
  redactions: RedactionRule[];
};

function mapPins(
  pins: Array<Record<string, unknown>>,
  attachments: Array<Record<string, unknown>>,
  token: string,
  allowDownload: boolean,
): ExperiencePin[] {
  return pins.map((p) => {
    const id = String(p.id);
    const atts = attachments
      .filter((a) => String(a.pin_id) === id)
      .map((a) => {
        const kind = a.kind === "url" ? "url" as const : "slatedrop" as const;
        const fileUrl = `/api/spatial-walkthrough/public/${token}/file?attachmentId=${a.id}`;
        return {
          id: String(a.id),
          kind,
          title: (a.title as string) ?? null,
          url: (a.external_url as string) ?? null,
          previewUrl: kind === "slatedrop" ? fileUrl : null,
          downloadUrl: kind === "slatedrop" && allowDownload ? `${fileUrl}&download=1` : (a.external_url as string) ?? null,
          fileName: (a.title as string) ?? null,
        };
      });
    return {
      id,
      label: String(p.label ?? "Pin"),
      pinType: String(p.pin_type ?? "document"),
      body: (p.body as string) ?? null,
      yawDeg: Number(p.yaw_deg ?? 0),
      pitchDeg: Number(p.pitch_deg ?? 0),
      tSeconds: p.t_seconds == null ? null : Number(p.t_seconds),
      attachments: atts,
    };
  });
}

export function WalkthroughShareClient({ token }: { token: string }) {
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SharePayload | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/spatial-walkthrough/public/${token}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && json.needsPassword) {
      setNeedsPassword(true);
      setPayload(null);
      return;
    }
    if (!res.ok) {
      setError("This walkthrough is unavailable.");
      return;
    }
    setNeedsPassword(false);
    setPayload(json as SharePayload);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const unlock = async (code: string) => {
    setError(null);
    const res = await fetch(`/api/spatial-walkthrough/public/${token}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      setError("That access code is not valid.");
      return;
    }
    await load();
  };

  if (needsPassword && !payload) {
    return <SharePasswordGate error={error} onSubmit={(value) => void unlock(value)} />;
  }
  if (error && !payload) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-sm text-[var(--graphite-text-header)]">{error}</div>;
  }
  if (!payload?.clip) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-sm text-[var(--graphite-muted)]">Preparing walkthrough…</div>;
  }

  return (
    <WalkthroughExperience
      theme={payload.theme}
      title={payload.walkthrough.title}
      videoUrl={payload.clip.proxyUrl}
      posterUrl={payload.clip.posterUrl}
      clipId={payload.clip.id}
      waypoints={payload.waypoints}
      pins={mapPins(payload.pins, payload.attachments, token, payload.allowDownload)}
      redactions={payload.redactions}
      operatorPatch={payload.operatorPatch}
      allowDownload={payload.allowDownload}
      capturedAt={payload.walkthrough.capturedAt}
      duration={Number((payload.clip as { durationS?: number }).durationS ?? 0)}
      walkthroughId={payload.walkthrough.id}
      collaboration={{
        shareToken: token,
        audience: payload.policy === "public" ? "public" : "client",
      }}
    />
  );
}
