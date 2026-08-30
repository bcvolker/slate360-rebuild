import { NextRequest, NextResponse } from "next/server";
import { loadShareRow, shareDenied, passwordOk, filterRuntime } from "@/lib/spatial-walkthrough/share-resolve";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";
import { parseOperatorPatch, resolveOperatorPatch } from "@/lib/spatial-walkthrough/operator-patch";
import { parseOrientationTrack } from "@/lib/spatial-walkthrough/orientation";
import { sessionUnlocksShare } from "@/lib/spatial-walkthrough/share-session";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { recordWalkthroughAudit } from "@/lib/spatial-walkthrough/audit";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { parseRedactionRow } from "@/lib/spatial-walkthrough/redaction-parse";
import { hiddenWaypointIds, stripBakedIntoDerivative } from "@/lib/spatial-walkthrough/redaction";
import { toWaypoint } from "@/lib/spatial-walkthrough/waypoints";
import { toChapter, visibleChapters } from "@/lib/spatial-walkthrough/chapters";
import { toClipEdge } from "@/lib/spatial-walkthrough/clip-edges";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

const checkRateLimit = createRateLimiter("spatial-walkthrough:public", 30, 60);

function passwordFrom(req: NextRequest): string | null {
  return req.headers.get("x-walkthrough-pass") || req.nextUrl.searchParams.get("code");
}

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const limited = await checkRateLimit(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const { admin, row } = await loadShareRow(token);
  if (shareDenied(row) || !row) return NextResponse.json(publicShareDenial(), { status: 404 });

  const unlocked = sessionUnlocksShare({ req, tokenHash: row.token_hash ?? "", passwordHash: row.password_hash });
  if (!unlocked && !passwordOk(row, passwordFrom(req))) {
    return NextResponse.json({ ...publicShareDenial(), needsPassword: true }, { status: 401 });
  }

  const { data: wt } = await admin.from("spatial_walkthroughs").select("*").eq("id", row.walkthrough_id).maybeSingle();
  if (!wt) return NextResponse.json(publicShareDenial(), { status: 404 });

  const [{ data: clips }, { data: waypoints }, { data: pins }, { data: redactions }, { data: chapters }, { data: edges }] = await Promise.all([
    admin.from("spatial_clips").select("id, title, zone, duration_s, default_yaw, default_pitch, status, sort_order, operator_patch, orientation, capture_meta, public_proxy_key").eq("walkthrough_id", wt.id).eq("status", "ready").order("sort_order"),
    admin.from("spatial_waypoints").select("*").eq("walkthrough_id", wt.id).order("sort_order"),
    admin.from("spatial_pins").select("*").eq("walkthrough_id", wt.id),
    admin.from("spatial_redactions").select("*").eq("walkthrough_id", wt.id),
    admin.from("spatial_chapters").select("*").eq("walkthrough_id", wt.id).order("sort_order"),
    admin.from("spatial_clip_edges").select("*").eq("walkthrough_id", wt.id),
  ]);
  const pinIds = (pins ?? []).map((p) => p.id);
  const { data: attachments } = pinIds.length
    ? await admin.from("spatial_pin_attachments").select("*").in("pin_id", pinIds)
    : { data: [] as never[] };

  const clip = (clips ?? [])[0];
  const runtime = clip
    ? filterRuntime({
        policy: row.policy,
        waypoints: waypoints ?? [],
        pins: pins ?? [],
        attachments: attachments ?? [],
        redactions: (redactions ?? []).map((r) => parseRedactionRow(r as Record<string, unknown>)),
        clipId: clip.id,
      })
    : { waypoints: [], pins: [], attachments: [], redactions: [] };

  await admin.from("spatial_share_tokens").update({
    view_count: row.view_count + 1,
    last_viewed_at: new Date().toISOString(),
  }).eq("id", row.id);
  await recordWalkthroughAudit(admin, {
    orgId: row.org_id,
    event: "share_opened",
    walkthroughId: row.walkthrough_id,
    resourceId: row.id,
    metadata: { policy: row.policy },
  });

  const theme = resolveBrandTheme({
    snapshot: row.branding_snapshot as Record<string, unknown> | null,
    walkthrough: wt.brand_theme,
    canHidePoweredBy: true,
  });
  if (theme.logoUrl) {
    theme.logoUrl = `/api/spatial-walkthrough/public/${token}/logo`;
  }

  const resolvedPatch = resolveOperatorPatch(clip?.operator_patch, parseOperatorPatch(wt.operator_patch));
  const publicShare = row.policy === "public";

  return NextResponse.json({
    product: "Spatial Walkthrough",
    policy: row.policy,
    allowDownload: row.allow_download,
    theme,
    operatorPatch: publicShare ? { ...resolvedPatch, enabled: false } : resolvedPatch,
    orientation: publicShare ? { source: "manual", keyframes: [], bakeable: true } : parseOrientationTrack(clip?.orientation),
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
          publicMediaReady: row.policy !== "public" || Boolean(clip.public_proxy_key),
          captureMeta: clip.capture_meta ?? {},
        }
      : null,
    clips: (clips ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      zone: c.zone,
      durationS: c.duration_s,
      defaultYaw: c.default_yaw,
      defaultPitch: c.default_pitch,
      sortOrder: c.sort_order,
      videoUrl: `/api/spatial-walkthrough/public/${token}/media?clip=${c.id}&kind=proxy`,
      posterUrl: `/api/spatial-walkthrough/public/${token}/media?clip=${c.id}&kind=poster`,
    })),
    chapters: visibleChapters((chapters ?? []).map(toChapter), row.policy),
    edges: (edges ?? []).map(toClipEdge),
    lockedChapterId: (row.chapter_id as string | null) ?? null,
    waypoints: (() => {
      const hidden = new Set<string>();
      for (const c of clips ?? []) hiddenWaypointIds(runtime.redactions, c.id).forEach((id) => hidden.add(id));
      return (waypoints ?? []).map(toWaypoint).filter((w) => w.isVisible && !hidden.has(w.id));
    })(),
    pins: runtime.pins,
    attachments: runtime.attachments,
    redactions: publicShare ? stripBakedIntoDerivative(runtime.redactions) : runtime.redactions,
  });
};
