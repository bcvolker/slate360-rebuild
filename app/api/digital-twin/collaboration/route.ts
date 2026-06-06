import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";

const COMMENT_SELECT =
  "id, space_id, subject_type, subject_id, author_user_id, author_display, body, parent_id, share_token_id, created_at";
const PIN_SELECT =
  "id, space_id, title, body, position, pin_status, priority, trade, color, created_at";

async function assertSpaceAccess(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  spaceId: string,
  orgId: string | null,
) {
  if (!orgId) return null;
  const { data } = await admin
    .from("digital_twin_spaces")
    .select("id, org_id, project_id")
    .eq("id", spaceId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
}

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const spaceId = req.nextUrl.searchParams.get("space_id")?.trim();
    if (!spaceId) return badRequest("space_id is required");

    const space = await assertSpaceAccess(admin, spaceId, orgId);
    if (!space) return notFound("Twin space not found");

    const { data: tokens } = await admin
      .from("digital_twin_share_tokens")
      .select("id, label, role, created_at")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

    const [{ data: comments, error: commentError }, { data: pins, error: pinError }] =
      await Promise.all([
        admin
          .from("digital_twin_comments")
          .select(COMMENT_SELECT)
          .eq("space_id", spaceId)
          .order("created_at", { ascending: true }),
        admin
          .from("digital_twin_pins")
          .select(PIN_SELECT)
          .eq("space_id", spaceId)
          .order("created_at", { ascending: false }),
      ]);

    if (commentError) return serverError(commentError.message);
    if (pinError) return serverError(pinError.message);

    const shareComments = (comments ?? []).filter((c) => c.share_token_id);
    const unreadCount = shareComments.filter((c) => !c.parent_id).length;

    return ok({
      tokens: tokens ?? [],
      comments: comments ?? [],
      pins: pins ?? [],
      unread_count: unreadCount,
    });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }
    if (!payload || typeof payload !== "object") return badRequest("Invalid payload");

    const p = payload as Record<string, unknown>;
    const spaceId = typeof p.space_id === "string" ? p.space_id.trim() : "";
    const body = typeof p.body === "string" ? p.body.trim() : "";
    const parentId = typeof p.parent_id === "string" ? p.parent_id.trim() : null;
    const subjectType =
      typeof p.subject_type === "string" ? p.subject_type.trim() : "space";
    const subjectId =
      typeof p.subject_id === "string" && p.subject_id.trim()
        ? p.subject_id.trim()
        : spaceId;

    if (!spaceId || !body) return badRequest("space_id and body are required");
    if (body.length > 8000) return badRequest("Comment too long");

    const space = await assertSpaceAccess(admin, spaceId, orgId);
    if (!space) return forbidden("Twin space not found");

    const { data, error } = await admin
      .from("digital_twin_comments")
      .insert({
        org_id: space.org_id,
        space_id: spaceId,
        subject_type: subjectType,
        subject_id: subjectId,
        author_user_id: user.id,
        body,
        parent_id: parentId,
      })
      .select(COMMENT_SELECT)
      .single();

    if (error) return serverError(error.message);
    return ok({ comment: data });
  });

export const PATCH = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }
    if (!payload || typeof payload !== "object") return badRequest("Invalid payload");

    const p = payload as Record<string, unknown>;
    const pinId = typeof p.pin_id === "string" ? p.pin_id.trim() : "";
    const pinStatus = typeof p.pin_status === "string" ? p.pin_status.trim() : "";
    const allowed = ["open", "in_progress", "resolved", "closed"];

    if (!pinId || !allowed.includes(pinStatus)) {
      return badRequest("pin_id and valid pin_status are required");
    }

    const { data: pin } = await admin
      .from("digital_twin_pins")
      .select("id, space_id, org_id")
      .eq("id", pinId)
      .maybeSingle();

    if (!pin) return notFound("Pin not found");

    const space = await assertSpaceAccess(admin, pin.space_id, orgId);
    if (!space || space.org_id !== pin.org_id) return forbidden("Access denied");

    const { data, error } = await admin
      .from("digital_twin_pins")
      .update({ pin_status: pinStatus })
      .eq("id", pinId)
      .select(PIN_SELECT)
      .single();

    if (error) return serverError(error.message);
    return ok({ pin: data });
  });
