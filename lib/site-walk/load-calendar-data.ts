import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type CalendarEvent = {
  id: string;
  title: string;
  /** ISO date/timestamp string (the item's due date). */
  dueDate: string;
  projectName: string | null;
  status: string | null;
};

/**
 * Upcoming + recently-overdue Site Walk tasks (items with a due date) for the
 * org, sorted soonest-first. Powers the mobile Coordination → Calendar list.
 * Project names are resolved via a separate lookup (no FK join assumption).
 */
export async function loadCoordinationCalendar(orgId: string | null): Promise<CalendarEvent[]> {
  if (!orgId) return [];

  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - 14); // keep recent overdue visible
  const sinceDate = since.toISOString().slice(0, 10);

  const [itemsResult, projectsResult] = await Promise.all([
    admin
      .from("site_walk_items")
      .select("id, title, due_date, item_status, project_id")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .not("due_date", "is", null)
      .gte("due_date", sinceDate)
      .order("due_date", { ascending: true })
      .limit(80),
    admin.from("projects").select("id, name").eq("org_id", orgId).limit(200),
  ]);

  const rows = (itemsResult.data ?? []) as Array<{
    id: string;
    title: string | null;
    due_date: string | null;
    item_status: string | null;
    project_id: string | null;
  }>;
  const projectName = new Map(
    ((projectsResult.data ?? []) as Array<{ id: string; name: string | null }>).map((p) => [
      p.id,
      p.name ?? null,
    ]),
  );

  return rows
    .filter((row) => row.due_date)
    .map((row) => ({
      id: row.id,
      title: row.title?.trim() || "Untitled task",
      dueDate: row.due_date as string,
      projectName: row.project_id ? projectName.get(row.project_id) ?? null : null,
      status: row.item_status ?? null,
    }));
}
