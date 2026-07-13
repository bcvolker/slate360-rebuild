import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadMobileAppHomeData } from "@/lib/mobile/load-app-home-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import { SW360StartWalkButton } from "@/components/sw360/SW360StartWalkButton";

/**
 * SW360 Home — real data, reusing the same loaders the legacy mobile home
 * already uses (loadMobileAppHomeData, start-walk.ts). B2.2: Start/Resume,
 * Needs attention, Assigned to you, active projects. No fake data.
 */
export default async function SW360HomePage() {
  const context = await resolveServerOrgContext();
  const orgId = context.orgId;
  const userId = context.user?.id ?? null;

  const [home, projectsRes] = await Promise.all([
    loadMobileAppHomeData(orgId, userId),
    orgId
      ? createAdminClient()
          .from("projects")
          .select("id, name")
          .eq("org_id", orgId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const projects = projectsRes.data ?? [];
  const resumableWalk = home.recentWalks.find((w) => w.status !== "completed" && w.status !== "archived");
  const unsentReports = home.hubSummary.draftDeliverables;
  const unanswered = home.alerts.length;
  const hasAttention = unsentReports > 0 || unanswered > 0;

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--sw360-charcoal)]">
          {context.user ? "Welcome back" : "Welcome"}
        </h1>
      </div>

      {resumableWalk ? (
        <Link
          href={buildCaptureLaunchUrl({ session: resumableWalk.id })}
          className="flex min-h-[64px] items-center justify-between rounded-2xl border border-[var(--sw360-green-light)] bg-white/70 px-5"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--sw360-green-light)]">Resume</p>
            <p className="text-sm font-semibold text-[var(--sw360-charcoal)]">{resumableWalk.title}</p>
          </div>
          <span className="text-sm font-bold text-[var(--sw360-green-light)]">→</span>
        </Link>
      ) : null}

      <SW360StartWalkButton projects={projects} />

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
          <p className="text-sm text-[var(--sw360-charcoal)]/60">No projects yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href="/sw360/projects"
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
