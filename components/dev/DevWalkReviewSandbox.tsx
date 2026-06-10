"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CaptureV2Summary } from "@/components/capture-v2/CaptureV2Summary";
import { measureWalkReviewLayout } from "@/lib/dev/measure-walk-review-layout";
import {
  buildDevWalkReviewItems,
  DEV_WALK_REVIEW_PROJECTS,
  DEV_WALK_REVIEW_PROJECT_SESSION,
  DEV_WALK_REVIEW_QUICK_SESSION,
  DEV_WALK_REVIEW_STOP_COUNTS,
  mapDevWalkReviewItems,
} from "@/lib/dev/mock-walk-review";

function parseStopCount(value: string | null): (typeof DEV_WALK_REVIEW_STOP_COUNTS)[number] {
  const parsed = Number.parseInt(value ?? "", 10);
  return DEV_WALK_REVIEW_STOP_COUNTS.includes(parsed as (typeof DEV_WALK_REVIEW_STOP_COUNTS)[number])
    ? (parsed as (typeof DEV_WALK_REVIEW_STOP_COUNTS)[number])
    : 8;
}

function parseVariant(value: string | null): "quick" | "project" {
  return value === "project" ? "project" : "quick";
}

export function DevWalkReviewSandbox() {
  const searchParams = useSearchParams();
  const stopCount = parseStopCount(searchParams?.get("stops") ?? null);
  const variant = parseVariant(searchParams?.get("variant") ?? null);

  const session = variant === "project" ? DEV_WALK_REVIEW_PROJECT_SESSION : DEV_WALK_REVIEW_QUICK_SESSION;
  const items = useMemo(
    () => mapDevWalkReviewItems(buildDevWalkReviewItems(stopCount)),
    [stopCount],
  );

  const measureKey = `${stopCount}:${variant}:${items.length}`;

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const sample = measureWalkReviewLayout(stopCount, variant);
      if (!sample) return;
      const node = document.getElementById("dev-walk-review-measure");
      if (node) node.textContent = JSON.stringify(sample);
    };

    const timer = window.setTimeout(run, 120);
    window.addEventListener("resize", run);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", run);
    };
  }, [measureKey, stopCount, variant]);

  return (
    <div className="h-full min-h-0">
      <CaptureV2Summary
        session={{
          id: session.id,
          title: session.title,
          status: session.status,
          projectId: session.project_id,
          projectName: session.project_name ?? null,
          isAdHoc: session.is_ad_hoc,
          lastSyncedAt: session.last_synced_at,
          completedAt: session.completed_at,
          startedAt: session.started_at,
          worksiteLabel: "Level 2 · East corridor",
        }}
        items={items}
        projects={DEV_WALK_REVIEW_PROJECTS}
        backHref="/dev/screens?screen=walk-review"
      />
      <pre id="dev-walk-review-measure" className="sr-only" aria-hidden />
    </div>
  );
}
