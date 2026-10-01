"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { publishChecklist } from "@/lib/spatial-tour/publish-checklist";
import { formatVisitDate } from "@/lib/spatial-tour/format";
import type { MatchQuality } from "@/lib/spatial-tour/types";
import { operatorTourUrls, type TourUrls } from "@/lib/spatial-tour/urls";
import { useTourBundle, type TourCallResult } from "./useTourBundle";
import { TourMarkPlayer, type PlayerView } from "./TourMarkPlayer";
import { TourCheckpointList } from "./TourCheckpointList";
import { TourPublishPanel } from "./TourPublishPanel";
import { TourCreateRoute } from "./TourCreateRoute";
import { TourLookConePanel } from "./TourLookConePanel";

export function TourOperator({
  projectId,
  urls: urlsProp,
  fill = "parent",
}: {
  projectId: string;
  urls?: TourUrls;
  /** "parent": fill the dashboard's scrolling content area; "viewport": standalone pages (harness). */
  fill?: "parent" | "viewport";
}) {
  const { bundle, loadError, busy, call } = useTourBundle(projectId);
  const urls = useMemo(() => urlsProp ?? operatorTourUrls(projectId), [urlsProp, projectId]);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [seek, setSeek] = useState<PlayerView | null>(null);
  const viewRef = useRef<PlayerView | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const onView = useCallback((v: PlayerView | null) => {
    viewRef.current = v;
    setPlayerReady(Boolean(v));
    if (v) setActiveClipId((was) => (was === v.clipId ? was : v.clipId));
  }, []);

  const report = (r: TourCallResult) => setMessage(r.ok ? null : r.error);
  const route = bundle?.route ?? null;
  const onRoute = useMemo(() => (bundle?.visits ?? []).filter((v) => v.routeId === route?.id), [bundle, route]);
  const visit = bundle?.visits.find((v) => v.walkthroughId === visitId) ?? onRoute[onRoute.length - 1] ?? bundle?.visits[0] ?? null;

  if (loadError) return <p className="text-sm text-[var(--graphite-muted)]">{loadError}</p>;
  if (!bundle) return <p className="text-sm text-[var(--graphite-muted)]" role="status">Loading route…</p>;
  if (!route) {
    return <TourCreateRoute visits={bundle.visits} busy={busy} onCreate={async (name, fromWalkthroughId) => report(await call("", "POST", { name, fromWalkthroughId }))} message={message} />;
  }

  const visitMarks = visit ? bundle.marks.filter((m) => m.walkthroughId === visit.walkthroughId) : [];
  const onThisRoute = visit?.routeId === route.id;
  const locked = Boolean(visit?.clientPublishedAt);
  const checklist = visit && onThisRoute ? publishChecklist({ visit, checkpoints: bundle.checkpoints, marks: bundle.marks }) : null;
  const activeClip = visit?.clips.find((c) => c.id === activeClipId) ?? visit?.clips.find((c) => c.hasPublicProxy) ?? null;
  // Marks need a decoded frame and a published view (framing-first privacy).
  const markBlocked = !playerReady
    ? "Marking unlocks once the video has loaded."
    : !activeClip?.lookCone
      ? "Set the published view first. Marks are framed inside it."
      : null;

  const mark = async (checkpointId: string, match: MatchQuality) => {
    if (!visit) return;
    const v = viewRef.current;
    if (match !== "not_captured" && !v) return setMessage("Wait for the video to load, then scrub to the spot.");
    report(
      await call("/marks", "PUT", {
        checkpointId,
        walkthroughId: visit.walkthroughId,
        match,
        ...(match === "not_captured" ? {} : { clipId: v!.clipId, t: v!.t, yaw: v!.yaw, pitch: v!.pitch }),
      }),
    );
  };

  const addCheckpoint = async (chapterId: string, label: string) => {
    const before = new Set(bundle.checkpoints.map((c) => c.id));
    const r = await call("/checkpoints", "POST", { chapterId, label });
    report(r);
    if (!r.ok) return;
    // The new checkpoint is marked at the current spot for this visit.
    const res = await fetch(`/api/projects/${projectId}/tour`, { cache: "no-store" });
    const fresh = (await res.json()) as typeof bundle;
    const created = fresh.checkpoints.find((c) => !before.has(c.id));
    if (created) await mark(created.id, "matched");
  };

  const tabBase = "flex shrink-0 flex-col items-start rounded-lg px-3 py-1.5 text-left text-xs font-semibold transition-colors";
  return (
    // Desktop: one viewport-height workspace (header + two panes). Only the checkpoint
    // list scrolls inside its pane; nothing stretches the page into blank space.
    <div
      className={`flex flex-col gap-3 lg:min-h-[560px] ${fill === "parent" ? "lg:h-full" : "lg:h-[calc(100dvh-var(--tour-chrome,4rem))]"}`}
      data-testid="tour-operator"
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] px-4 py-2.5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]">Directed Tour route</p>
          <h2 className="truncate text-base font-semibold text-[var(--graphite-text-header)]">{route.name}</h2>
        </div>
        <div className="order-last flex min-w-0 basis-full gap-1.5 overflow-x-auto sm:order-none sm:basis-auto sm:flex-1" role="tablist" aria-label="Visits">
          {bundle.visits.map((v) => {
            const active = v.walkthroughId === visit?.walkthroughId;
            const state = v.routeId !== route.id ? "Not on route" : v.clientPublishedAt ? "Published" : "Draft";
            return (
              <button
                key={v.walkthroughId}
                type="button"
                role="tab"
                aria-selected={active}
                className={`${tabBase} ${active ? "bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] text-[var(--graphite-text-header)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--graphite-primary)_30%,transparent)]" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"}`}
                onClick={() => {
                  setVisitId(v.walkthroughId);
                  setMessage(null);
                  setPlayerReady(false);
                  viewRef.current = null;
                }}
              >
                <span>{formatVisitDate(v.capturedAt)}</span>
                <span className="font-mono text-[10px] font-normal uppercase tracking-wide">{state}</span>
              </button>
            );
          })}
        </div>
        <Link
          href={`/tour-card/${projectId}`}
          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-[var(--mobile-app-card-border)] px-3 text-xs font-semibold text-[var(--graphite-text-body)]"
          target="_blank"
        >
          Capture card
        </Link>
      </header>

      {message ? <p className="text-sm text-[var(--destructive)]" role="alert">{message}</p> : null}

      {!visit ? null : !onThisRoute ? (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--mobile-app-card-border)] px-4 py-3">
          <p className="text-sm text-[var(--graphite-muted)]">This visit is not on the route yet.</p>
          <button type="button" className={t.primaryButton} disabled={busy} onClick={async () => report(await call(`/visits/${visit.walkthroughId}`, "POST", { action: "attach" }))}>
            Add this visit to the route
          </button>
        </section>
      ) : (
        <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(440px,1fr)]">
          {/* Left: the player takes whatever height is left, so the pane never ends in blank space. */}
          <div className="flex flex-col gap-3 lg:min-h-0">
            <TourMarkPlayer walkthroughId={visit.walkthroughId} clips={visit.clips} seekRequest={seek} onView={onView} urls={urls} />
            {activeClip ? (
              <TourLookConePanel
                key={`${visit.walkthroughId}-${activeClip.id}`}
                cone={activeClip.lookCone}
                locked={locked}
                busy={busy}
                canUseView={playerReady}
                getHeading={() => viewRef.current?.yaw ?? null}
                onSave={async (cone) => report(await call(`/visits/${visit.walkthroughId}`, "POST", { action: "look-cone", clipId: activeClip.id, cone }))}
              />
            ) : null}
          </div>
          {/* Right: checkpoints size to their content and scroll inside once long; status sits right under them. */}
          <div className="flex flex-col gap-3 lg:min-h-0">
            <TourCheckpointList
              stillUrl={urls.still}
              chapters={bundle.chapters}
              checkpoints={bundle.checkpoints}
              marks={visitMarks}
              locked={locked}
              busy={busy}
              markBlocked={markBlocked}
              onMark={mark}
              onSelect={(m) => m.clipId && m.tSeconds != null && setSeek({ clipId: m.clipId, t: m.tSeconds, yaw: m.yawDeg, pitch: m.pitchDeg })}
              onAddCheckpoint={addCheckpoint}
              onAddChapter={async (name) => report(await call("/chapters", "POST", { name }))}
              onRetire={async (checkpointId) => {
                if (!window.confirm("Retire this checkpoint? Old links to it keep working, but it leaves the route.")) return;
                report(await call("/checkpoints", "PATCH", { checkpointId, retire: true }));
              }}
            />
            {checklist ? (
              <TourPublishPanel
                visit={visit}
                items={checklist.items}
                canPublish={checklist.canPublish}
                failedStills={visitMarks.filter((m) => m.stillStatus === "failed").length}
                busy={busy}
                onAction={async (action) => report(await call(`/visits/${visit.walkthroughId}`, "POST", { action }))}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
