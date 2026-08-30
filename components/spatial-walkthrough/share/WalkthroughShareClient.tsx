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
  walkthrough: { title: string };
  clip: { id: string; proxyUrl: string; posterUrl: string | null } | null;
  waypoints: WaypointRecord[];
  pins: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
  redactions: RedactionRule[];
};

function withCode(url: string, code: string | null): string {
  if (!code) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}code=${encodeURIComponent(code)}`;
}

function mapPins(
  pins: Array<Record<string, unknown>>,
  attachments: Array<Record<string, unknown>>,
  token: string,
  code: string | null,
): ExperiencePin[] {
  return pins.map((p) => {
    const id = String(p.id);
    const atts = attachments
      .filter((a) => String(a.pin_id) === id)
      .map((a) => {
        const kind = a.kind === "url" ? "url" as const : "slatedrop" as const;
        const fileUrl = withCode(`/api/spatial-walkthrough/public/${token}/file?attachmentId=${a.id}`, code);
        return {
          id: String(a.id),
          kind,
          title: (a.title as string) ?? null,
          url: (a.external_url as string) ?? null,
          previewUrl: kind === "slatedrop" ? fileUrl : null,
          downloadUrl: kind === "slatedrop" ? fileUrl : (a.external_url as string) ?? null,
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
  const [code, setCode] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SharePayload | null>(null);

  const load = useCallback(async (pass: string | null) => {
    setError(null);
    const headers: Record<string, string> = {};
    if (pass) headers["x-walkthrough-pass"] = pass;
    const res = await fetch(`/api/spatial-walkthrough/public/${token}`, { headers, cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && json.needsPassword) {
      setNeedsPassword(true);
      setPayload(null);
      if (pass) setError("That access code is not valid.");
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
    void load(code);
  }, [load, code]);

  if (needsPassword && !payload) {
    return <SharePasswordGate error={error} onSubmit={(value) => setCode(value)} />;
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
      videoUrl={withCode(payload.clip.proxyUrl, code)}
      posterUrl={payload.clip.posterUrl ? withCode(payload.clip.posterUrl, code) : null}
      clipId={payload.clip.id}
      waypoints={payload.waypoints}
      pins={mapPins(payload.pins, payload.attachments, token, code)}
      redactions={payload.redactions}
      operatorPatch={payload.operatorPatch}
      allowDownload={payload.allowDownload}
    />
  );
}
