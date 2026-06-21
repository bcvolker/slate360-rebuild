import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

// GET /api/content-studio/projects — return the org's current edit project,
// creating a default one if none exists. Single-project model for the CEO tool.
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    const { data: existing } = await admin
      .from("content_edit_projects")
      .select("id, title, timeline_json, ui_state_json, mode")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let project = existing;
    if (!project) {
      const { data: created, error } = await admin
        .from("content_edit_projects")
        .insert({ org_id: orgId, created_by: user.id, title: "Untitled edit" })
        .select("id, title, timeline_json, ui_state_json, mode")
        .single();
      if (error || !created) return serverError(error?.message ?? "Failed to create project");
      project = created;
    }

    return ok({
      project: {
        id: project.id,
        title: project.title,
        mode: project.mode,
        timelineJson: project.timeline_json ?? {},
        uiStateJson: project.ui_state_json ?? {},
      },
    });
  });

// PATCH /api/content-studio/projects — autosave the timeline (+ optional ui state / title).
export const PATCH = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    let body: { id?: string; timelineJson?: unknown; uiStateJson?: unknown; title?: string; mode?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }
    const id = (body.id ?? "").trim();
    if (!id) return badRequest("id required");

    const update: Record<string, unknown> = {};
    if (body.timelineJson !== undefined) update.timeline_json = body.timelineJson;
    if (body.uiStateJson !== undefined) update.ui_state_json = body.uiStateJson;
    if (typeof body.title === "string") update.title = body.title;
    if (body.mode === "video" || body.mode === "360" || body.mode === "photo") update.mode = body.mode;
    if (Object.keys(update).length === 0) return badRequest("Nothing to update");

    const { error } = await admin
      .from("content_edit_projects")
      .update(update)
      .eq("id", id)
      .eq("org_id", orgId);
    if (error) return serverError(error.message);

    return ok({ saved: true });
  });
