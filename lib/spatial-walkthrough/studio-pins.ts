import type { ExperiencePin } from "@/components/spatial-walkthrough/viewer/WalkthroughExperience";

export function studioPinsFromPayload(
  pins: Array<Record<string, unknown>>,
  attachments: Array<Record<string, unknown>>,
): ExperiencePin[] {
  return pins.map((p) => ({
    id: String(p.id),
    label: String(p.label),
    pinType: String(p.pin_type),
    body: (p.body as string) ?? null,
    yawDeg: Number(p.yaw_deg ?? 0),
    pitchDeg: Number(p.pitch_deg ?? 0),
    tSeconds: p.t_seconds == null ? null : Number(p.t_seconds),
    attachments: attachments
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
  }));
}
