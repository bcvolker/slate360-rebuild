"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { useMemo } from "react";
import {
  buildCaptureV2LaunchUrl,
  buildCaptureV2ReviewItemUrl,
} from "@/lib/site-walk/capture-v2-config";
import type { HubProject } from "@/lib/types/site-walk";
import { CaptureV2WalkReviewActions } from "./CaptureV2WalkReviewActions";
import { CaptureV2WalkReviewGrid } from "./CaptureV2WalkReviewGrid";
import { CaptureV2WalkReviewTopBar } from "./CaptureV2WalkReviewTopBar";
import { walkReviewTokens } from "./capture-v2-walk-review-tokens";
import type {
  CaptureV2SummaryItem,
  CaptureV2SummarySession,
} from "./capture-v2-summary-types";
import { useCaptureV2WalkReviewLiveItems } from "./useCaptureV2WalkReviewLiveItems";

type Props = {
  session: CaptureV2SummarySession;
  items: CaptureV2SummaryItem[];
  projects: HubProject[];
  backHref?: string;
};

export function CaptureV2Summary({ session, items, projects, backHref = "/site-walk/walks" }: Props) {
  const itemHref = useMemo(
    () => (itemId: string) => buildCaptureV2ReviewItemUrl(session.id, itemId),
    [session.id],
  );
  const { cards } = useCaptureV2WalkReviewLiveItems({
    sessionId: session.id,
    projectId: session.projectId,
    initialItems: items,
    itemHref,
  });

  const contextLine = useMemo(() => buildWalkReviewContextLine(session, items), [items, session]);
  const showAttachToProject = session.isAdHoc && !session.projectId;
  const deliverableHref = `/site-walk/deliverables/new?session=${encodeURIComponent(session.id)}`;

  return (
    <main
      className={`relative flex h-full min-h-0 flex-col overflow-hidden ${walkReviewTokens.canvas}`}
      data-walk-review="screen"
    >
      <CaptureV2WalkReviewTopBar stopCount={cards.length} backHref={backHref} />
      <p className={`${walkReviewTokens.margin} shrink-0 pb-3 ${walkReviewTokens.contextLine}`} data-walk-review="context">
        {contextLine}
      </p>

      {cards.length === 0 ? (
        <EmptyWalkReview sessionId={session.id} />
      ) : (
        <CaptureV2WalkReviewGrid cards={cards} />
      )}

      <CaptureV2WalkReviewActions
        sessionId={session.id}
        showAttachToProject={showAttachToProject}
        projects={projects}
        deliverableHref={deliverableHref}
      />
    </main>
  );
}

function EmptyWalkReview({ sessionId }: { sessionId: string }) {
  return (
    <div className={`${walkReviewTokens.margin} flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] p-6 text-center`}>
        <Camera className="h-8 w-8 text-[var(--graphite-muted)]" />
        <h2 className="mt-3 text-lg font-bold text-[var(--graphite-text-header)]">No stops yet</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--graphite-muted)]">
          Return to capture to add photos or notes to this walk.
        </p>
        <Link
          href={buildCaptureV2LaunchUrl({ session: sessionId, plan: "skip", quick: "camera" })}
          className={`mt-5 ${walkReviewTokens.primaryButton}`}
        >
          Capture first photo
        </Link>
    </div>
  );
}

function buildWalkReviewContextLine(session: CaptureV2SummarySession, items: CaptureV2SummaryItem[]) {
  const projectLabel = session.isAdHoc ? "Quick walk" : session.projectName ?? "Plan walk";
  const worksite =
    items.find((item) => item.locationLabel?.trim())?.locationLabel?.trim() ??
    session.worksiteLabel?.trim() ??
    "Field site";
  const dateSource = session.completedAt ?? session.startedAt ?? session.lastSyncedAt;
  const dateLabel = dateSource
    ? new Date(dateSource).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Today";
  return `${projectLabel} · ${worksite} · ${dateLabel}`;
}
