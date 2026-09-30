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

export function TourOperator({ projectId, urls: urlsProp }: { projectId: string; urls?: TourUrls }) {
  const { bundle, loadError, busy, call } = useTourBundle(projectId);
  const urls = useMemo(() => urlsProp ?? operatorTourUrls(projectId), [urlsProp, projectId]);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [seek, setSeek] = useState<PlayerView | null>(null);
  const viewRef = useRef<PlayerView | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const onView = useCallback((v: PlayerView | null) => {
    viewRef.current = v;
    setPlayerReady((was) => was || Boolean(v));
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

  return (
    <div className="space-y-5" data-testid="tour-operator">
      <section className={t.sectionCard}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={t.eyebrow}>Directed Tour route</p>
            <h2 className="truncate text-lg font-semibold text-[var(--graphite-text-header)]">{route.name}</h2>
          </div>
          <Link href={`/tour-card/${projectId}`} className={t.secondaryButton} target="_blank">
            Capture card
          </Link>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Visits">
          {bundle.visits.map((v) => {
            const active = v.walkthroughId === visit?.walkthroughId;
            const state = v.routeId !== route.id ? "Not on route" : v.clientPublishedAt ? "Published" : "Draft";
            return (
              <button
                key={v.walkthroughId}
                type="button"
                role="tab"
                aria-selected={active}
                className={`${t.tabLink} ${active ? t.tabLinkActive : ""} flex-col items-start py-2`}
                onClick={() => {
                  setVisitId(v.walkthroughId);
                  setMessage(null);
                  setPlayerReady(false);
                  viewRef.current = null;
                }}
              >
                <span>{formatVisitDate(v.capturedAt)}</span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{state}</span>
              </button>
            );
          })}
        </div>
      </section>

      {message ? <p className="text-sm text-[var(--destructive)]" role="alert">{message}</p> : null}

      {!visit ? null : !onThisRoute ? (
        <section className={t.sectionCard}>
          <p className="text-sm text-[var(--graphite-muted)]">This visit is not on the route yet.</p>
          <button type="button" className={`${t.primaryButton} mt-3`} disabled={busy} onClick={async () => report(await call(`/visits/${visit.walkthroughId}`, "POST", { action: "attach" }))}>
            Add this visit to the route
          </button>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <TourMarkPlayer walkthroughId={visit.walkthroughId} clips={visit.clips} seekRequest={seek} onView={onView} urls={urls} />
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
          <TourCheckpointList
            stillUrl={urls.still}
            chapters={bundle.chapters}
            checkpoints={bundle.checkpoints}
            marks={visitMarks}
            locked={locked}
            busy={busy}
            canMarkFrame={playerReady}
            onMark={mark}
            onSelect={(m) => m.clipId && m.tSeconds != null && setSeek({ clipId: m.clipId, t: m.tSeconds, yaw: m.yawDeg, pitch: m.pitchDeg })}
            onAddCheckpoint={addCheckpoint}
            onAddChapter={async (name) => report(await call("/chapters", "POST", { name }))}
            onRetire={async (checkpointId) => {
              if (!window.confirm("Retire this checkpoint? Old links to it keep working, but it leaves the route.")) return;
              report(await call("/checkpoints", "PATCH", { checkpointId, retire: true }));
            }}
          />
        </div>
      )}
    </div>
  );
}
