import type { ReactNode } from "react";
import { ProjectOverviewTab } from "@/components/projects/ProjectOverviewTab";
import { ProjectDetailShell } from "@/components/projects/ProjectDetailShell";
import { WalkthroughLibrary, type WalkthroughCard } from "@/components/spatial-walkthrough/WalkthroughLibrary";
import { ShareRoleMatrix } from "@/components/spatial-walkthrough/portal/ShareRoleMatrix";
import { SpatialPortalHome } from "@/components/studio-ui/SpatialPortalHome";
import { resolveDashboardNav } from "@/components/dashboard-desktop/dashboard-nav-config";
import type { ProjectOverviewData } from "@/lib/projects/load-project-overview-data";
import { mergeClientSurfaceFlags, projectTabIdsForSurface, projectTabLabel, visibleClientApps } from "@/lib/spatial-walkthrough/client-surface";
import { PROJECT_DETAIL_TABS, type ProjectDetailTabId } from "@/components/projects/projectDetailTabs";

const captured = "2026-08-12T15:00:00.000Z";

const WALKS: WalkthroughCard[] = [
  { id: "w1", title: "Lobby — morning capture", captured_at: captured, building: "Tower A", floor: "1", zone: "Lobby", walkthrough_type: "interior", status: "published", duration_s: 842, waypointCount: 12, pinCount: 4 },
  { id: "w2", title: "Roof aerial", captured_at: "2026-08-11T18:00:00.000Z", building: "Tower A", floor: "Roof", zone: "North", walkthrough_type: "aerial", status: "ready", duration_s: 310, waypointCount: 6, pinCount: 1 },
];

function spatialOverview(spatialOnly: boolean): ProjectOverviewData {
  return {
    projectId: "demo",
    name: "Harbor Point",
    status: "Active",
    locationLabel: "Tacoma, WA",
    description: "Client portal for Spatial Walkthrough reviews on Harbor Point.",
    startDate: "2026-04-01",
    endDate: null,
    counts: { walks: spatialOnly ? 0 : 4, twins: spatialOnly ? 0 : 1, files: 18, deliverables: spatialOnly ? 0 : 2, teamMembers: 5, walkthroughs: 2 },
    lastFileUploadAt: captured,
    recentActivity: [],
    latestWalkthrough: { id: "w1", title: WALKS[0].title, capturedAt: captured, building: "Tower A", floor: "1", href: "#" },
    recentWalkthroughs: WALKS.map((w) => ({ id: w.id, title: w.title, capturedAt: w.captured_at, building: w.building, floor: w.floor, href: "#" })),
    recentFiles: [{ id: "f1", kind: "file", title: "Spec sheet.pdf", meta: "File uploaded", href: "#", occurredAt: captured }],
    recentPins: [{ id: "p1", title: "RFI-14 flashing", meta: "issue", href: "#" }],
    showTwins: !spatialOnly,
    showSiteWalk: !spatialOnly,
    showWalkthroughs: true,
    spatialOnly,
  };
}

function PreviewChrome({
  spatialOnly,
  title,
  nav,
  children,
}: {
  spatialOnly: boolean;
  title: string;
  nav: string[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)]">
      <div className="flex min-h-[100dvh]">
        <aside className="hidden w-52 shrink-0 border-r border-white/10 p-4 lg:block">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--graphite-muted)]">Slate360</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
            {spatialOnly ? "Spatial portal" : "Multi-product"}
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            {nav.map((label) => (
              <li key={label} className="px-2 py-1.5 text-[var(--graphite-text-body)]">{label}</li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex h-12 items-center border-b border-white/10 px-4">
            <p className="text-sm font-semibold">{title}</p>
          </header>
          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default async function SpatialPortalPreview({
  searchParams,
}: {
  searchParams: Promise<{ surface?: string; screen?: string; org?: string; scene?: string }>;
}) {
  const params = await searchParams;
  const spatialOnly = (params.org ?? params.surface ?? "spatial-only") !== "multi";
  const screen = params.scene ?? params.screen ?? "home";
  const flags = mergeClientSurfaceFlags({
    isCeo: false,
    betaMode: true,
    purchased: {
      spatialWalkthrough: true,
      siteWalk: !spatialOnly,
      twin360: !spatialOnly,
      slatedrop: !spatialOnly,
      designStudio: false,
      contentStudio: false,
    },
  });
  const nav = resolveDashboardNav(false, false, visibleClientApps(flags));
  const allowed = new Set(projectTabIdsForSurface(flags));
  const hiddenTabIds = PROJECT_DETAIL_TABS.map((t) => t.id).filter((id) => !allowed.has(id)) as ProjectDetailTabId[];
  const tabLabels = Object.fromEntries(
    PROJECT_DETAIL_TABS.map((tab) => [tab.id, projectTabLabel(tab.id, flags) ?? tab.label]),
  );

  const title =
    screen === "home"
      ? spatialOnly
        ? "Projects"
        : "Home"
      : screen === "library"
        ? "Spatial Walkthroughs"
        : screen === "sharing"
          ? "Sharing"
          : "Harbor Point";

  if (screen === "viewer") {
    return (
      <div className="relative h-[100dvh] overflow-hidden bg-black">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 70% at 50% 45%, color-mix(in_srgb,var(--graphite-primary) 18%, var(--graphite-canvas)) 0%, var(--graphite-canvas) 72%)",
          }}
        />
        <p className="absolute left-4 top-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
          Spatial Walkthrough · Tower A · Floor 1
        </p>
        <div className="absolute bottom-6 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">Lobby — morning capture</p>
            <p className="mt-1 text-sm text-white/70">Waypoint 4 of 12 · RFI-14 flashing</p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex min-h-11 items-center border border-white/20 px-3 text-sm text-white">Prev</span>
            <span className="inline-flex min-h-11 items-center border border-white/20 px-3 text-sm text-white">Next</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PreviewChrome spatialOnly={spatialOnly} title={title} nav={nav.map((i) => i.label)}>
      {screen === "home" ? (
        spatialOnly ? (
          <SpatialPortalHome projectCount={3} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {[
              { title: "Spatial Walkthroughs", body: "Published 360 captures, pins, and client shares." },
              { title: "Site Walks", body: "Field photos, plans, and punch items." },
              { title: "Twin 360", body: "Interactive reality models for this org." },
            ].map((app) => (
              <article key={app.title} className="border border-white/10 bg-white/[0.04] p-4">
                <h2 className="text-sm font-semibold">{app.title}</h2>
                <p className="mt-1 text-sm text-[var(--graphite-muted)]">{app.body}</p>
              </article>
            ))}
          </div>
        )
      ) : null}
      {screen === "library" ? (
        <>
          <h1 className="mb-4 text-xl font-semibold">Library</h1>
          <WalkthroughLibrary items={WALKS} />
        </>
      ) : null}
      {screen === "sharing" ? (
        <div className="space-y-4">
          <section className="border border-white/10 bg-white/[0.04] p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Member access</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex min-h-11 items-center justify-between gap-2">
                <span className="text-[var(--graphite-text-header)]">Alex Chen</span>
                <span className="text-[var(--graphite-muted)]">Owner · view, download, share, manage</span>
              </li>
              <li className="flex min-h-11 items-center justify-between gap-2">
                <span className="text-[var(--graphite-text-header)]">Jordan Patel</span>
                <span className="text-[var(--graphite-muted)]">Member · view, download, share</span>
              </li>
            </ul>
          </section>
          <ShareRoleMatrix />
        </div>
      ) : null}
      {screen === "overview" || screen === "files" ? (
        <ProjectDetailShell
          projectId="demo"
          projectName="Harbor Point"
          status="Active"
          locationLabel="Tacoma, WA"
          showTwins={!spatialOnly}
          hiddenTabIds={hiddenTabIds}
          tabLabels={tabLabels}
        >
          {screen === "files" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--graphite-muted)]">
                Project files stay project-global and reusable across walks.
              </p>
              <ul className="space-y-2">
                {["Spec sheet.pdf", "Lobby finish schedule.xlsx", "Roof aerial still.jpg"].map((name) => (
                  <li key={name} className="flex min-h-11 items-center justify-between border border-white/10 bg-white/[0.04] px-4 text-sm">
                    <span className="text-[var(--graphite-text-header)]">{name}</span>
                    <span className="text-[var(--graphite-muted)]">Project file</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ProjectOverviewTab data={spatialOverview(spatialOnly)} />
          )}
        </ProjectDetailShell>
      ) : null}
    </PreviewChrome>
  );
}
