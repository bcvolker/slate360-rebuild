import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { APP_STORE_MODE } from "@/lib/app-store-mode";
import type {
  DashboardHomeCounts,
  DashboardRecentProject,
  DashboardRecentTwin,
  DashboardRecentWalk,
} from "@/lib/dashboard/load-dashboard-home-data";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

type DashboardHomeContentProps = {
  workspaceName: string;
  counts: DashboardHomeCounts;
  recentProjects: DashboardRecentProject[];
  recentWalks: DashboardRecentWalk[];
  recentTwins: DashboardRecentTwin[];
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DashboardHomeContent({
  workspaceName,
  counts,
  recentProjects,
  recentWalks,
  recentTwins,
}: DashboardHomeContentProps) {
  // Site Walk is the only visible app for the first release (AGENTS.md) — keep
  // Twin counts/sections out of the dashboard until the module is released.
  const showTwins = !APP_STORE_MODE;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header>
        <h1 className={t.pageTitle}>Dashboard</h1>
        <p className={t.pageSubtitle}>{workspaceName} — workspace overview from live data.</p>
      </header>

      <section aria-label="Workspace counts">
        <div className={`grid gap-3 ${showTwins ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <StatCard label="Projects" value={counts.projects} href="/projects" />
          <StatCard label="Site Walks" value={counts.siteWalks} href="/site-walks" />
          {showTwins ? (
            <StatCard label="Digital Twins" value={counts.digitalTwins} href="/digital-twins" />
          ) : null}
        </div>
      </section>

      <RecentSection
        title="Recent Projects"
        viewAllHref="/projects"
        emptyTitle="No projects yet"
        emptyDescription="Create a project to organize walks, files, and field activity."
        emptyActionLabel="View projects"
        emptyActionHref="/projects"
        items={recentProjects.map((project) => ({
          key: project.id,
          href: `/projects/${project.id}`,
          primary: project.name,
          secondary: `${project.status} · ${formatDate(project.createdAt)}`,
        }))}
      />

      <RecentSection
        title="Recent Site Walks"
        viewAllHref="/site-walks"
        emptyTitle="No site walks yet"
        emptyDescription="Start a walk from Site Walk on mobile, or open the walks list when sessions exist."
        emptyActionLabel="Browse walks"
        emptyActionHref="/site-walks"
        items={recentWalks.map((walk) => ({
          key: walk.id,
          href: `/site-walk/walks/${walk.id}`,
          primary: walk.title,
          secondary: `${walk.status} · ${formatDate(walk.updatedAt)}`,
        }))}
      />

      {showTwins ? (
        <RecentSection
          title="Recent Digital Twins"
          viewAllHref="/digital-twins"
          emptyTitle="No digital twins yet"
          emptyDescription="Capture and process a twin from the Digital Twin app when your workspace has twin access."
          emptyActionLabel="Browse twins"
          emptyActionHref="/digital-twins"
          items={recentTwins.map((twin) => ({
            key: twin.id,
            href: `/digital-twin/twins/${twin.id}`,
            primary: twin.title,
            secondary: `${twin.status} · ${formatDate(twin.updatedAt)}`,
          }))}
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className={`block ${t.statCard} transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]`}>
      <p className={t.statValue}>{value.toLocaleString()}</p>
      <p className={t.statLabel}>{label}</p>
    </Link>
  );
}

type RecentItem = { key: string; href: string; primary: string; secondary: string };

function RecentSection({
  title,
  viewAllHref,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
  items,
}: {
  title: string;
  viewAllHref: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel: string;
  emptyActionHref: string;
  items: RecentItem[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={t.sectionLabel}>{title}</h2>
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--graphite-primary)] hover:underline"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <DashboardEmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          actionHref={emptyActionHref}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link href={item.href} className={t.listRow}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                    {item.primary}
                  </span>
                  <span className="block truncate text-xs text-[var(--graphite-muted)]">{item.secondary}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
