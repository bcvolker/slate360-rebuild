import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, created, badRequest, serverError } from "@/lib/server/api-response";

const COLORS = ["#D4AF37","#2563EB","#059669","#7C3AED","#D97706","#DB2777","#0891B2","#65A30D"];

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("No organization found");

    const url = new URL(req.url);
    const project = url.searchParams.get("project");
    const q = url.searchParams.get("q")?.toLowerCase();
    const tag = url.searchParams.get("tag");

    let query = admin
      .from("org_contacts")
      .select(`
        *,
        contact_projects ( project_id, projects ( id, name ) )
      `)
      .eq("org_id", orgId)
      .eq("is_archived", false)
      .order("name");

    if (project) {
      // Filter contacts that have this project association
      const { data: assoc } = await admin
        .from("contact_projects")
        .select("contact_id")
        .eq("project_id", project);
      const ids = (assoc ?? []).map((a) => a.contact_id);
      if (ids.length === 0) return ok({ contacts: [] });
      query = query.in("id", ids);
    }

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query;
    if (error) return serverError(error.message);

    let contacts = data ?? [];
    if (q) {
      contacts = contacts.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q)
      );
    }

    return ok({ contacts });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("No organization found");

    const body = await req.json() as {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      title?: string;
      notes?: string;
      tags?: string[];
      color?: string;
      project_ids?: string[];
    };

    if (!body.name?.trim()) return badRequest("Name is required");

    const colorIndex = Math.floor(Math.random() * COLORS.length);

    const { data, error } = await admin
      .from("org_contacts")
      .insert({
        org_id: orgId,
        created_by: user.id,
        name: body.name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        company: body.company?.trim() || null,
        title: body.title?.trim() || null,
        notes: body.notes?.trim() || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        color: body.color || COLORS[colorIndex],
      })
      .select()
      .single();

    if (error) return serverError(error.message);

    // Link to projects if supplied
    if (Array.isArray(body.project_ids) && body.project_ids.length > 0) {
      await admin.from("contact_projects").insert(
        body.project_ids.map((pid) => ({ contact_id: data.id, project_id: pid }))
      );
    }

    return created({ contact: data });
  });
