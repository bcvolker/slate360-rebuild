import { NextRequest, NextResponse } from "next/server";
import { loadShareRow, shareDenied, passwordOk, filterRuntime } from "@/lib/spatial-walkthrough/share-resolve";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

function passwordFrom(req: NextRequest): string | null {
  return req.headers.get("x-walkthrough-pass") || req.nextUrl.searchParams.get("code");
}

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const { token } = await ctx.params;
  const { admin, row } = await loadShareRow(token);
  const deny = shareDenied(row);
  if (deny || !row) return NextResponse.json({ error: deny ?? "invalid" }, { status: 404 });
  if (!passwordOk(row, passwordFrom(req))) {
    return NextResponse.json({ error: "password", needsPassword: true }, { status: 401 });
  }

  const { data: wt } = await admin.from("spatial_walkthroughs").select("*").eq("id", row.walkthrough_id).maybeSingle();
  if (!wt) return NextResponse.json({ error: "missing" }, { status: 404 });

  const [{ data: clips }, { data: waypoints }, { data: pins }, { data: redactions }] = await Promise.all([
    admin.from("spatial_clips").select("id, title, zone, duration_s, default_yaw, default_pitch, status, sort_order").eq("walkthrough_id", wt.id).eq("status", "ready").order("sort_order"),
    admin.from("spatial_waypoints").select("*").eq("walkthrough_id", wt.id).order("sort_order"),
    admin.from("spatial_pins").select("*").eq("walkthrough_id", wt.id),
    admin.from("spatial_redactions").select("*").eq("walkthrough_id", wt.id),
  ]);
  const pinIds = (pins ?? []).map((p) => p.id);
  const { data: attachments } = pinIds.length
    ? await admin.from("spatial_pin_attachments").select("*").in("pin_id", pinIds)
    : { data: [] as never[] };

  const rules: RedactionRule[] = (redactions ?? []).map((r) => ({
    clipId: r.clip_id,
    tStart: Number(r.t_start),
    tEnd: Number(r.t_end),
    yawMin: r.yaw_min,
    yawMax: r.yaw_max,
    pitchMin: r.pitch_min,
    pitchMax: r.pitch_max,
    mode: r.mode,
    policy: r.policy,
    reason: r.reason,
  }));

  const clip = (clips ?? [])[0];
  const runtime = clip
    ? filterRuntime({
        policy: row.policy,
        waypoints: waypoints ?? [],
        pins: pins ?? [],
        attachments: attachments ?? [],
        redactions: rules,
        clipId: clip.id,
      })
    : { waypoints: [], pins: [], attachments: [], redactions: [] };

  await admin.from("spatial_share_tokens").update({
    view_count: row.view_count + 1,
    last_viewed_at: new Date().toISOString(),
  }).eq("id", row.id);

  const theme = resolveBrandTheme({
    snapshot: row.branding_snapshot,
    walkthrough: wt.brand_theme,
    canHidePoweredBy: true,
  });
  if (theme.logoUrl) {
    theme.logoUrl = `/api/spatial-walkthrough/public/${token}/logo`;
  }

  return NextResponse.json({
    product: "Spatial Walkthrough",
    policy: row.policy,
    allowDownload: row.allow_download,
    theme,
    operatorPatch: wt.operator_patch,
    walkthrough: {
      id: wt.id,
      title: wt.title,
      capturedAt: wt.captured_at,
      building: wt.building,
      floor: wt.floor,
      zone: wt.zone,
      type: wt.walkthrough_type,
      durationS: wt.duration_s,
    },
    clip: clip
      ? {
          id: clip.id,
          title: clip.title,
          durationS: clip.duration_s,
          defaultYaw: clip.default_yaw,
          defaultPitch: clip.default_pitch,
          proxyUrl: `/api/spatial-walkthrough/public/${token}/media?clip=${clip.id}&kind=proxy`,
          posterUrl: `/api/spatial-walkthrough/public/${token}/media?clip=${clip.id}&kind=poster`,
        }
      : null,
    waypoints: runtime.waypoints,
    pins: runtime.pins,
    attachments: runtime.attachments,
    redactions: runtime.redactions,
  });
};
