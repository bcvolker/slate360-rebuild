import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { unauthorized, notFound, badRequest, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";
import { buildExportPackage } from "@/lib/spatial-walkthrough/export-package";
import { buildWalkthroughSummaryPdf } from "@/lib/spatial-walkthrough/export-pdf";
import { rulesForPolicy, type RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import { hiddenWaypointIds } from "@/lib/spatial-walkthrough/redaction";
import { recordWalkthroughAudit } from "@/lib/spatial-walkthrough/audit";
import { pinVisibleOnPolicy } from "@/lib/spatial-walkthrough/pins";
import type { AccessPolicy } from "@/lib/spatial-walkthrough/types";
import { APP_URL } from "@/lib/email";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

async function objectBytes(key: string): Promise<Uint8Array | null> {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = obj.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
    if (!body?.transformToByteArray) return null;
    return await body.transformToByteArray();
  } catch {
    return null;
  }
}

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as {
      policy?: AccessPolicy;
      includePdf?: boolean;
      includeMaster?: boolean;
      stillClipId?: string;
    };
    const policy: AccessPolicy = body.policy === "public" || body.policy === "master" ? body.policy : "client";
    const includeMaster = body.includeMaster === true && policy === "master";

    const { data: wt } = await admin.from("spatial_walkthroughs").select("*").eq("id", id).eq("org_id", orgId).maybeSingle();
    if (!wt) return notFound("Walkthrough not found");
    const [{ data: waypoints }, { data: pins }, { data: shares }, { data: redactions }, { data: project }] = await Promise.all([
      admin.from("spatial_waypoints").select("*").eq("walkthrough_id", id).order("sort_order"),
      admin.from("spatial_pins").select("*").eq("walkthrough_id", id),
      admin.from("spatial_share_tokens").select("token_prefix, policy, is_revoked, expires_at, token").eq("walkthrough_id", id),
      admin.from("spatial_redactions").select("*").eq("walkthrough_id", id),
      admin.from("projects").select("name").eq("id", wt.project_id).maybeSingle(),
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
      waypointId: r.waypoint_id,
    }));
    const scoped = rulesForPolicy(rules, policy);
    const hidden = new Set<string>();
    for (const wp of waypoints ?? []) hiddenWaypointIds(scoped, String(wp.clip_id)).forEach((x) => hidden.add(x));

    const activeShare = (shares ?? []).find((s) => !s.is_revoked);
    const shareUrl = activeShare?.token ? `${APP_URL}/w/${activeShare.token}` : null;

    const approved: Array<{ id: string; pinId: string; title: string | null; fileName: string | null; bytes: Uint8Array | null; hidden: boolean }> = [];
    for (const att of attachments ?? []) {
      const pin = (pins ?? []).find((p) => p.id === att.pin_id);
      if (!pin || !pinVisibleOnPolicy(pin.visibility as "internal" | "client" | "public", policy)) continue;
      if (policy === "public" && !att.visible_on_public) continue;
      let bytes: Uint8Array | null = null;
      let fileName = att.title as string | null;
      if (att.slatedrop_id) {
        const { data: file } = await admin.from("slatedrop_uploads").select("s3_key, file_name").eq("id", att.slatedrop_id).maybeSingle();
        if (file?.s3_key) {
          bytes = await objectBytes(file.s3_key);
          fileName = file.file_name;
        }
      }
      approved.push({ id: att.id, pinId: att.pin_id, title: att.title, fileName, bytes, hidden: false });
    }

    const stills: Array<{ name: string; bytes: Uint8Array }> = [];
    if (body.stillClipId) {
      const { data: clip } = await admin.from("spatial_clips").select("poster_key").eq("id", body.stillClipId).eq("walkthrough_id", id).maybeSingle();
      if (clip?.poster_key) {
        const bytes = await objectBytes(clip.poster_key);
        if (bytes) stills.push({ name: "poster.jpg", bytes });
      }
    }

    const files = buildExportPackage({
      policy,
      includeMaster,
      masterPermitted: includeMaster,
      product: "Spatial Walkthrough",
      title: wt.title,
      capturedAt: wt.captured_at,
      building: wt.building,
      floor: wt.floor,
      zone: wt.zone,
      walkthroughType: wt.walkthrough_type,
      durationS: wt.duration_s,
      shareUrl,
      pins: (pins ?? []).map((p) => ({
        id: p.id, label: p.label, pinType: p.pin_type, tSeconds: p.t_seconds,
        yawDeg: p.yaw_deg, pitchDeg: p.pitch_deg, visibility: p.visibility,
      })),
      waypoints: (waypoints ?? [])
        .filter((w) => !hidden.has(w.id))
        .map((w) => ({
          id: w.id, clipId: w.clip_id, tSeconds: w.t_seconds, label: w.label,
          zone: w.zone, yawDeg: w.yaw_deg, pitchDeg: w.pitch_deg, isVisible: w.is_visible !== false,
        })),
      attachments: approved,
      redactions: scoped,
      captureNotes: null,
      stills,
    });

    if (body.includePdf !== false) {
      const visiblePins = (pins ?? []).filter((p) => pinVisibleOnPolicy(p.visibility as "internal" | "client" | "public", policy));
      const pdf = await buildWalkthroughSummaryPdf({
        title: wt.title,
        projectName: project?.name ?? "Project",
        capturedAt: wt.captured_at,
        pins: visiblePins.map((p) => ({
          id: p.id, label: p.label, pinType: p.pin_type, tSeconds: p.t_seconds,
          yawDeg: p.yaw_deg, pitchDeg: p.pitch_deg, visibility: p.visibility,
        })),
        shareUrl,
        stillDataUrl: null,
        logoDataUrl: null,
      });
      files.push({ path: "spatial-walkthrough-summary.pdf", contents: pdf });
    }

    const zip = new JSZip();
    for (const f of files) zip.file(f.path, f.contents);
    const bytes = await zip.generateAsync({ type: "uint8array" });
    await recordWalkthroughAudit(admin, {
      orgId,
      userId: user.id,
      event: "export_generated",
      walkthroughId: id,
      metadata: { policy, includeMaster },
    });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="spatial-walkthrough-export.zip"`,
      },
    });
  }, "view");

export const GET = (req: NextRequest, ctx: Ctx) =>
  POST(req, ctx);
