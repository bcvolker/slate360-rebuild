import Link from "next/link";
import { ArrowRight, Box, Cloud, MapPin, Wrench, type LucideIcon } from "lucide-react";
import { APP_STORE_MODE } from "@/lib/app-store-mode";
import { appHomeTokens as ah } from "@/components/studio-ui/app-home-tokens";
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
  showOpsConsole: boolean;
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
  showOpsConsole,
}: DashboardHomeContentProps) {
  // Twin 360 is revealed when reviewer/App-Store mode is off (lib/app-store-mode.ts).
  const showTwins = !APP_STORE_MODE;

  const apps: AppTile[] = [
    { label: "Site Walk", href: "/site-walk", icon: MapPin, description: "Capture photos and pin to plans.", accent: "primary" },
    showTwins
      ? { label: "Twin 360 Studio", href: "/digital-twin", icon: Box, description: "Build interactive 3D reality twins.", accent: "info" }
      : null,
    { label: "SlateDrop", href: "/slatedrop", icon: Cloud, description: "Plans, photos, and shared field files.", accent: "primary" },
    showOpsConsole
      ? { label: "Operations Console", href: "/operations-console", icon: Wrench, description: "Internal staff tools and analysis.", accent: "info" }
      : null,
  ].filter((app): app is AppTile => app !== null);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4">
      <header>
        <h1 className={t.pageTitle}>Dashboard</h1>
        <p className={t.pageSubtitle}>{workspaceName} — workspace overview from live data.</p>
      </header>

      <section aria-label="Apps">
        <h2 className={t.sectionLabel}>Apps</h2>
        <div className="mt-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {apps.map((app) => (
            <AppTileCard key={app.href} {...app} />
          ))}
        </div>
      </section>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <ProjectsRail items={recentProjects} total={counts.projects} />

        <RecentSection
          title={`Recent Site Walks${counts.siteWalks ? ` · ${counts.siteWalks}` : ""}`}
          viewAllHref="/site-walks"
          emptyTitle="No site walks yet"
          emptyDescription="Start a walk from Site Walk on mobile, or open the walks list when sessions exist."
          emptyActionLabel="Browse walks"
          emptyActionHref="/site-walks"
          items={recentWalks.slice(0, 5).map((walk) => ({
            key: walk.id,
            href: `/site-walk/walks/${walk.id}`,
            primary: walk.title,
            secondary: `${walk.status} · ${formatDate(walk.updatedAt)}`,
          }))}
        />
      </div>

      {showTwins ? (
        <RecentSection
          title={`Recent Digital Twins${counts.digitalTwins ? ` · ${counts.digitalTwins}` : ""}`}
          viewAllHref="/digital-twins"
          emptyTitle="No digital twins yet"
          emptyDescription="Capture and process a twin from the Digital Twin app when your workspace has twin access."
          emptyActionLabel="Browse twins"
          emptyActionHref="/digital-twins"
          items={recentTwins.slice(0, 3).map((twin) => ({
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

type AppTile = { label: string; href: string; icon: LucideIcon; description: string; accent: "primary" | "info" };

function AppTileCard({ label, href, icon: Icon, description, accent }: AppTile) {
  const isInfo = accent === "info";
  return (
    <Link
      href={href}
      className={`${ah.launcherTileBase} ${isInfo ? ah.launcherTileInfo : ah.launcherTilePrimary}`}
    >
      <span className={isInfo ? ah.launcherIconChipInfo : ah.launcherIconChipPrimary}>
        <Icon className={isInfo ? ah.launcherIconInfo : ah.launcherIconPrimary} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={ah.launcherTitle}>{label}</p>
        <p className={isInfo ? ah.launcherStatusInfo : ah.launcherStatusPrimary}>{description}</p>
      </div>
      <ArrowRight className={isInfo ? ah.launcherChevronInfo : ah.launcherChevronPrimary} />
    </Link>
  );
}

function ProjectsRail({ items, total }: { items: DashboardRecentProject[]; total: number }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={t.sectionLabel}>Projects{total ? ` · ${total}` : ""}</h2>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--graphite-primary)] hover:underline"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <DashboardEmptyState
          title="No projects yet"
          description="Create a project to organize walks, files, and field activity."
          actionLabel="View projects"
          actionHref="/projects"
        />
      ) : (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {items.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={`${t.cardInteractive} w-64 shrink-0 snap-start p-4`}
            >
              <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                {project.name}
              </p>
              <p className="mt-1 truncate text-xs text-[var(--graphite-muted)]">
                {project.status} · {formatDate(project.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
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
