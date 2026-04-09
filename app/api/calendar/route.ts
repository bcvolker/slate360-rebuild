import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, created, badRequest, serverError } from "@/lib/server/api-response";

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("No organization found");

    const url = new URL(req.url);
    const month = url.searchParams.get("month"); // YYYY-MM
    const project = url.searchParams.get("project");

    let query = admin
      .from("calendar_events")
      .select("*, projects(id, name)")
      .eq("org_id", orgId)
      .order("date");

    if (month) {
      const [y, m] = month.split("-");
      const first = `${y}-${m}-01`;
      const last = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10);
      query = query.gte("date", first).lte("date", last);
    }

    if (project) query = query.eq("project_id", project);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok({ events: data ?? [] });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("No organization found");

    const body = await req.json() as {
      title?: string;
      date?: string;
      start_time?: string;
      end_time?: string;
      color?: string;
      description?: string;
      location?: string;
      project_id?: string;
      all_day?: boolean;
    };

    if (!body.title?.trim()) return badRequest("Title is required");
    if (!body.date) return badRequest("Date is required");

    const { data, error } = await admin
      .from("calendar_events")
      .insert({
        org_id: orgId,
        created_by: user.id,
        title: body.title.trim(),
        date: body.date,
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        color: body.color || "#D4AF37",
        description: body.description?.trim() || null,
        location: body.location?.trim() || null,
        project_id: body.project_id || null,
        all_day: body.all_day ?? true,
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return created({ event: data });
  });
