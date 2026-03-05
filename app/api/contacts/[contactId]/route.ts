import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

type Ctx = { params: Promise<{ contactId: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("No organization found");
    const { contactId } = await ctx.params;

    const { data, error } = await admin
      .from("org_contacts")
      .select(`
        *,
        contact_projects ( project_id, projects ( id, name ) ),
        contact_files ( id, file_name, mime_type, size_bytes, created_at )
      `)
      .eq("id", contactId)
      .eq("org_id", orgId)
      .single();

    if (error || !data) return notFound("Contact not found");
    return ok({ contact: data });
  });

export const PATCH = (req: NextRequest, ctx: Ctx) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("No organization found");
    const { contactId } = await ctx.params;

    const body = await req.json() as {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      title?: string;
      notes?: string;
      tags?: string[];
      color?: string;
      is_archived?: boolean;
      project_ids?: string[];
    };

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.email !== undefined) updates.email = body.email.trim() || null;
    if (body.phone !== undefined) updates.phone = body.phone.trim() || null;
    if (body.company !== undefined) updates.company = body.company.trim() || null;
    if (body.title !== undefined) updates.title = body.title.trim() || null;
    if (body.notes !== undefined) updates.notes = body.notes.trim() || null;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.color !== undefined) updates.color = body.color;
    if (body.is_archived !== undefined) updates.is_archived = body.is_archived;

    const { data, error } = await admin
      .from("org_contacts")
      .update(updates)
      .eq("id", contactId)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return serverError(error.message);

    // Replace project associations if provided
    if (Array.isArray(body.project_ids)) {
      await admin.from("contact_projects").delete().eq("contact_id", contactId);
      if (body.project_ids.length > 0) {
        await admin.from("contact_projects").insert(
          body.project_ids.map((pid) => ({ contact_id: contactId, project_id: pid }))
        );
      }
    }

    return ok({ contact: data });
  });

export const DELETE = (req: NextRequest, ctx: Ctx) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("No organization found");
    const { contactId } = await ctx.params;

    const { error } = await admin
      .from("org_contacts")
      .delete()
      .eq("id", contactId)
      .eq("org_id", orgId);

    if (error) return serverError(error.message);
    return ok({ deleted: true });
  });
