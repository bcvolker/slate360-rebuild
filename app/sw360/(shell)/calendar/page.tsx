import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";
import { SW360CalendarClient, type SW360CalendarEvent } from "@/components/sw360/SW360CalendarClient";

type EventRow = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  projects: { name: string } | { name: string }[] | null;
};

/**
 * Full Calendar screen — one of Q4's multi-door destinations (rev 7 lock).
 * Org-wide, not project-scoped; reads calendar_events directly (same table
 * Home's This-week strip and CalendarEventSheet write to).
 */
export default async function SW360CalendarPage() {
  const context = await resolveServerOrgContext();
  const orgId = context.orgId;

  const { data } = orgId
    ? await createAdminClient()
        .from("calendar_events")
        .select("id, title, date, location, projects(name)")
        .eq("org_id", orgId)
        .order("date", { ascending: true })
    : { data: [] as EventRow[] };

  const events: SW360CalendarEvent[] = ((data ?? []) as EventRow[]).map((row) => {
    const rel = row.projects;
    const projectName = Array.isArray(rel) ? (rel[0]?.name ?? null) : (rel?.name ?? null);
    return { id: row.id, title: row.title, date: row.date, location: row.location, projectName };
  });

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <SW360BackHeader href="/sw360" label="Home" />
      <h1 className="text-xl font-black tracking-tight text-[var(--sw360-charcoal)]">Calendar</h1>
      <SW360CalendarClient initialEvents={events} />
    </div>
  );
}
