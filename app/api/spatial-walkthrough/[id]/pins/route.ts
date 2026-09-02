import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import { PIN_TYPES } from "@/lib/spatial-walkthrough/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const POST = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const { data: wt } = await admin.from("spatial_walkthroughs").select("id, project_id").eq("id", id).eq("org_id", orgId).maybeSingle();
    if (!wt) return notFound("Walkthrough not found");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    if (!label) return badRequest("label required");
    const pinType = PIN_TYPES.includes(body?.pinType as never) ? body?.pinType : "document";
    const { data: pin, error } = await admin.from("spatial_pins").insert({
      org_id: orgId,
      project_id: wt.project_id,
      walkthrough_id: id,
      clip_id: typeof body?.clipId === "string" ? body.clipId : null,
      created_by: user.id,
      label,
      pin_type: pinType,
      body: typeof body?.body === "string" ? body.body : null,
      t_seconds: typeof body?.tSeconds === "number" ? body.tSeconds : null,
      yaw_deg: typeof body?.yawDeg === "number" ? body.yawDeg : null,
      pitch_deg: typeof body?.pitchDeg === "number" ? body.pitchDeg : null,
      visibility: body?.visibility === "public" || body?.visibility === "internal" ? body.visibility : "client",
    }).select("*").single();
    if (error) return serverError(error.message);

    const attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    for (const att of attachments) {
      if (!att || typeof att !== "object") continue;
      const a = att as Record<string, unknown>;
      if (a.kind === "url" && typeof a.url === "string") {
        await admin.from("spatial_pin_attachments").insert({
          org_id: orgId, pin_id: pin.id, kind: "url", external_url: a.url,
          title: typeof a.title === "string" ? a.title : null,
          visible_on_public: a.visibleOnPublic === true,
        });
      }
      if (a.kind === "document" && typeof a.documentId === "string") {
        const { data: doc } = await admin.from("spatial_project_documents").select("id, title, slatedrop_id, source_url").eq("id", a.documentId).eq("org_id", orgId).maybeSingle();
        if (!doc) continue;
        await admin.from("spatial_pin_attachments").insert({
          org_id: orgId, pin_id: pin.id, kind: "slatedrop", slatedrop_id: doc.slatedrop_id,
          title: doc.title, external_url: doc.source_url,
          visible_on_public: a.visibleOnPublic !== false,
        });
      }
      if (a.kind === "slatedrop" && typeof a.fileId === "string") {
        const { data: file } = await admin.from("slatedrop_uploads").select("id").eq("id", a.fileId).eq("org_id", orgId).maybeSingle();
        if (!file) continue;
        await admin.from("spatial_pin_attachments").insert({
          org_id: orgId, pin_id: pin.id, kind: "slatedrop", slatedrop_id: file.id,
          title: typeof a.title === "string" ? a.title : null,
          visible_on_public: a.visibleOnPublic === true,
        });
      }
    }
    const { data: saved } = await admin.from("spatial_pin_attachments").select("*").eq("pin_id", pin.id);
    return ok({ pin, attachments: saved ?? [] }, 201);
  }, "author");
