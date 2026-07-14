import { createAdminClient } from "@/lib/supabase/admin";

export type WeekStripEvent = {
  id: string;
  title: string;
  dateLabel: string;
  projectName: string | null;
};

export type PeopleStripContact = {
  id: string;
  name: string;
  company: string | null;
  initials: string | null;
};

function dayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Home's "This week" strip — org-wide calendar_events for the next 7 days,
 * per rev 7 lock (SITEWALK360_LOCK_SHEET.md Q1). Queries calendar_events
 * directly rather than the mixed site_walk_items+calendar_events loader the
 * legacy Coordination Calendar page uses, since Home only needs real
 * scheduled events, not derived task due-dates.
 */
export async function loadWeekStrip(orgId: string | null): Promise<WeekStripEvent[]> {
  if (!orgId) return [];
  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 7);
  const end = endDate.toISOString().slice(0, 10);

  const { data } = await createAdminClient()
    .from("calendar_events")
    .select("id, title, date, projects(name)")
    .eq("org_id", orgId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true })
    .limit(5);

  return ((data ?? []) as unknown as Array<{
    id: string;
    title: string;
    date: string;
    projects: { name: string } | { name: string }[] | null;
  }>).map((row) => {
    const rel = row.projects;
    const projectName = Array.isArray(rel) ? (rel[0]?.name ?? null) : (rel?.name ?? null);
    return { id: row.id, title: row.title, dateLabel: dayLabel(row.date), projectName };
  });
}

/**
 * Home's "People" strip — recently added org_contacts, per rev 7 lock (Q1 +
 * Q4). Same reduced row shape as MobileContactsClient so the strip and the
 * full /sw360/contacts screen render contacts identically.
 */
export async function loadPeopleStrip(orgId: string | null): Promise<PeopleStripContact[]> {
  if (!orgId) return [];
  const { data } = await createAdminClient()
    .from("org_contacts")
    .select("id, name, company, initials")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(6);
  return (data ?? []) as PeopleStripContact[];
}
