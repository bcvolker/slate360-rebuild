import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
import {
  filterItemList,
  listPayload,
  visibleItems,
  type ProjectItemStatus,
} from "@/lib/spatial-walkthrough/project-items";
import {
  emitItemEvent,
  insertLocator,
  loadProjectItems,
  parseItemType,
  parsePriority,
  parseStatus,
  parseVisibility,
} from "@/lib/spatial-walkthrough/project-item-store";
import { makeItemEvent } from "@/lib/spatial-walkthrough/item-events";

export const runtime = "nodejs";

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user, access }) => {
    if (!orgId) return unauthorized("Organization required");
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return badRequest("projectId required");
    const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
    if (!project) return notFound("Project not found");
    const all = await loadProjectItems(admin, { orgId, projectId });
    const audience = access.canView ? "contractor" as const : "client";
    const visible = visibleItems(all, audience, user.id);
    const items = filterItemList(visible, {
      assigneeId: req.nextUrl.searchParams.get("assignee") || null,
      status: (req.nextUrl.searchParams.get("status") as ProjectItemStatus | "all") || "all",
      mine: req.nextUrl.searchParams.get("mine") === "1",
      viewerId: user.id,
    });
    return ok(listPayload(items));
  });

export const POST = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId, user, access }) => {
    if (!orgId) return unauthorized("Organization required");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const projectId = typeof body?.projectId === "string" ? body.projectId : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!projectId || !title) return badRequest("projectId and title required");
    const { data: project } = await admin.from("projects").select("id").eq("id", projectId).eq("org_id", orgId).maybeSingle();
    if (!project) return notFound("Project not found");
    const type = parseItemType(body?.type ?? (access.canAuthor ? "observation" : "question"));
    const visibility = parseVisibility(body?.visibility, access.canAuthor ? "internal" : "client");
    const { data: row, error } = await admin.from("spatial_project_items").insert({
      org_id: orgId,
      project_id: projectId,
      type,
      title,
      description: typeof body?.description === "string" ? body.description : null,
      status: parseStatus(body?.status),
      priority: parsePriority(body?.priority),
      assignee_id: typeof body?.assigneeId === "string" ? body.assigneeId : null,
      due_date: typeof body?.dueDate === "string" ? body.dueDate : null,
      created_by: user.id,
      visibility,
    }).select("*").single();
    if (error || !row) return serverError(error?.message ?? "create failed");
    if (body?.locator && typeof body.locator === "object") {
      const loc = body.locator as Record<string, unknown>;
      await insertLocator(admin, orgId, row.id, {
        walkthroughId: typeof loc.walkthroughId === "string" ? loc.walkthroughId : null,
        clipId: typeof loc.clipId === "string" ? loc.clipId : null,
        chapterId: typeof loc.chapterId === "string" ? loc.chapterId : null,
        tSeconds: typeof loc.tSeconds === "number" ? loc.tSeconds : null,
        yawDeg: typeof loc.yawDeg === "number" ? loc.yawDeg : null,
        pitchDeg: typeof loc.pitchDeg === "number" ? loc.pitchDeg : null,
      });
    }
    await emitItemEvent(admin, {
      orgId,
      event: makeItemEvent("created", row.id, projectId, user.id, { type }, typeof (body?.locator as { walkthroughId?: string })?.walkthroughId === "string" ? (body?.locator as { walkthroughId: string }).walkthroughId : null),
    });
    return ok({ item: row }, 201);
  });
