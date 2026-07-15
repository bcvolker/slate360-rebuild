import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadMobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import { loadWeekStrip, loadPeopleStrip } from "@/lib/sw360/load-home-strips";
import { createAdminClient } from "@/lib/supabase/admin";
import { SW360StartWalkButton } from "@/components/sw360/SW360StartWalkButton";
import { SW360BrandHero } from "@/components/sw360/SW360BrandHero";
import { SW360RecentWalksScroller, type RecentWalkCard } from "@/components/sw360/SW360RecentWalksScroller";
import { SW360CalendarPeopleRow } from "@/components/sw360/SW360CalendarPeopleRow";
import { SW360ExpandableSection } from "@/components/sw360/SW360ExpandableSection";

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
 * SW360 Home order, per Brian's 2026-07-14/15 feedback: primary actions,
 * then Recent walks / Active projects up top as bounded, tinted,
 * expand-in-place containers (full-width rows, not pills; a single
 * expand/collapse control, not a competing "See all" link), then
 * attention/assignments with real visual weight, then the cross-cutting
 * Calendar + People row at the bottom.
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
          .limit(20)
      : Promise.resolve({ data: [] as ProjectRow[] }),
    orgId
      ? createAdminClient()
          .from("site_walk_sessions")
          .select("id, title, status, projects(name)")
          .eq("org_id", orgId)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
          .limit(20)
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

      <SW360RecentWalksScroller walks={recentWalks} />

      {projects.length === 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Active projects
          </p>
          <Link
            href="/sw360/projects"
            className="flex min-h-[80px] flex-col justify-center rounded-2xl border border-dashed border-[var(--sw360-charcoal)]/25 bg-white/40 px-5"
          >
            <p className="text-sm font-bold text-[var(--sw360-charcoal)]">Create your first project</p>
            <p className="mt-0.5 text-xs text-[var(--sw360-charcoal)]/60">
              A project keeps every walk, plan, and report for a job in one place.
            </p>
          </Link>
        </div>
      ) : (
        <SW360ExpandableSection title="Active projects" itemCount={projects.length} rowHeightPx={52}>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/sw360/projects/${p.id}`}
              className="flex items-center border-b border-[var(--sw360-charcoal)]/8 px-4 py-3 last:border-b-0"
              style={{ minHeight: 52 }}
            >
              <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{p.name}</p>
            </Link>
          ))}
        </SW360ExpandableSection>
      )}

      {hasAttention ? (
        <div
          className="overflow-hidden rounded-2xl border border-[var(--sw360-charcoal)]/20 bg-[var(--sw360-green-light)]/[0.1]"
          style={{ boxShadow: "0 2px 6px color-mix(in srgb, var(--sw360-green-light) 18%, transparent)" }}
        >
          <div className="border-l-4 border-[var(--sw360-green-light)] px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-[var(--sw360-charcoal)]">
              <AlertCircle size={14} className="text-[var(--sw360-green-light)]" />
              Needs attention
            </p>
            <div className="mt-2 flex flex-col gap-2 text-sm text-[var(--sw360-charcoal)]">
              {unsentReports > 0 ? (
                <Link
                  href="/sw360/reports"
                  className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2"
                >
                  <span className="font-semibold">{unsentReports} report{unsentReports === 1 ? "" : "s"} not sent yet</span>
                  <span className="text-[var(--sw360-green-light)]">→</span>
                </Link>
              ) : null}
              {unanswered > 0 ? (
                <Link
                  href="/sw360/inbox"
                  className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2"
                >
                  <span className="font-semibold">{unanswered} update{unanswered === 1 ? "" : "s"} in your Inbox</span>
                  <span className="text-[var(--sw360-green-light)]">→</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {home.assignments.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">
            Assigned to you
          </p>
          <div className="overflow-hidden rounded-2xl border border-[var(--sw360-charcoal)]/20 bg-[var(--sw360-silver)]/40">
            {home.assignments.slice(0, 4).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between border-b border-[var(--sw360-charcoal)]/8 px-4 py-3 last:border-b-0"
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

      <SW360CalendarPeopleRow weekEventCount={weekEvents.length} peopleCount={peopleContacts.length} />
    </div>
  );
}
