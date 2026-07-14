import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadMobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import { loadWeekStrip, loadPeopleStrip } from "@/lib/sw360/load-home-strips";
import { createAdminClient } from "@/lib/supabase/admin";
import { SW360StartWalkButton } from "@/components/sw360/SW360StartWalkButton";
import { SW360BrandHero } from "@/components/sw360/SW360BrandHero";
import { SW360RecentWalksScroller, type RecentWalkCard } from "@/components/sw360/SW360RecentWalksScroller";
import { SW360WeekStrip } from "@/components/sw360/SW360WeekStrip";
import { SW360PeopleStrip } from "@/components/sw360/SW360PeopleStrip";

type ProjectRow = { id: string; name: string };
type SessionJoinRow = {
  id: string;
  title: string | null;
  status: string;
  projects: { name: string } | { name: string }[] | null;
};

function projectNameFromJoin(row: SessionJoinRow): string | null {
  const rel = row.projects;
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0]?.name ?? null) : rel.name;
}

/**
 * SW360 Home — real data throughout. Reworked per Brian's on-device
 * feedback: no more single "Resume [walk]" banner claiming to know THE
 * relevant walk — a Recent walks scroller across projects instead, and
 * Start-a-walk routes to Projects (rather than an on-page picker) once
 * there's more than one project, since starting a walk FROM a project is
 * the intuitive path.
 */
export default async function SW360HomePage() {
  const context = await resolveServerOrgContext();
  const orgId = context.orgId;
  const userId = context.user?.id ?? null;

  const [home, projectsRes, recentWalksRes, weekEvents, peopleContacts] = await Promise.all([
    loadMobileAppHomeData(orgId, userId),
    orgId
      ? createAdminClient()
          .from("projects")
          .select("id, name")
          .eq("org_id", orgId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as ProjectRow[] }),
    orgId
      ? createAdminClient()
          .from("site_walk_sessions")
          .select("id, title, status, projects(name)")
          .eq("org_id", orgId)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as SessionJoinRow[] }),
    loadWeekStrip(orgId),
    loadPeopleStrip(orgId),
  ]);

  const projects = projectsRes.data ?? [];
  const recentWalks: RecentWalkCard[] = ((recentWalksRes.data ?? []) as SessionJoinRow[]).map((w) => ({
    id: w.id,
    title: w.title || "Untitled walk",
    status: w.status,
    projectName: projectNameFromJoin(w),
  }));
  const unsentReports = home.hubSummary.draftDeliverables;
  const unanswered = home.alerts.length;
  const hasAttention = unsentReports > 0 || unanswered > 0;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <SW360BrandHero greeting={context.user ? "Welcome back" : "Welcome"} />

      <SW360StartWalkButton projects={projects} showQuickWalk />

      <SW360WeekStrip events={weekEvents} />

      <SW360RecentWalksScroller walks={recentWalks} />

      {hasAttention ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Needs attention
          </p>
          <div className="mt-2 flex flex-col gap-1.5 text-sm text-[var(--sw360-charcoal)]">
            {unsentReports > 0 ? (
              <Link href="/sw360/reports" className="flex items-center justify-between">
                <span>{unsentReports} report{unsentReports === 1 ? "" : "s"} not sent yet</span>
                <span className="text-[var(--sw360-green-light)]">→</span>
              </Link>
            ) : null}
            {unanswered > 0 ? (
              <Link href="/sw360/inbox" className="flex items-center justify-between">
                <span>{unanswered} update{unanswered === 1 ? "" : "s"} in your Inbox</span>
                <span className="text-[var(--sw360-green-light)]">→</span>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {home.assignments.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Assigned to you
          </p>
          <div className="flex flex-col gap-2">
            {home.assignments.slice(0, 4).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
              >
                <p className="text-sm font-semibold text-[var(--sw360-charcoal)]">{a.title}</p>
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/50">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <SW360PeopleStrip contacts={peopleContacts} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Active projects
          </p>
          <Link href="/sw360/projects" className="text-xs font-bold text-[var(--sw360-green-light)]">
            See all
          </Link>
        </div>
        {projects.length === 0 ? (
          <Link
            href="/sw360/projects"
            className="flex min-h-[80px] flex-col justify-center rounded-2xl border border-dashed border-[var(--sw360-charcoal)]/25 bg-white/40 px-5"
          >
            <p className="text-sm font-bold text-[var(--sw360-charcoal)]">Create your first project</p>
            <p className="mt-0.5 text-xs text-[var(--sw360-charcoal)]/60">
              A project keeps every walk, plan, and report for a job in one place.
            </p>
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/sw360/projects/${p.id}`}
                className="rounded-xl border border-[var(--border)] bg-white/70 p-3"
              >
                <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{p.name}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
