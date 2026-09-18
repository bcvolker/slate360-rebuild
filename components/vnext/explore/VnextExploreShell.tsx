"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { useVnextFullscreen } from "./use-vnext-fullscreen";
import { VnextRepresentationSelector } from "./VnextRepresentationSelector";
import { VnextExploreSourcePicker } from "./VnextExploreSourcePicker";
import { VnextExploreViewerStage } from "./VnextExploreViewerStage";
import { VnextExploreViewerControls } from "./VnextExploreViewerControls";
import { VnextExploreEmptyState } from "./VnextExploreEmptyState";
import { VnextExploreErrorState } from "./VnextExploreErrorState";
import { VNEXT_EXPLORE_HELP } from "./vnext-explore-help-copy";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import type { VnextExploreData } from "@/lib/vnext/explore-types";

type Props = {
  data: VnextExploreData;
  initialPresent: boolean;
  /** This page's own path, e.g. /vnext/projects/[id]/explore or /preview/vnext/project/explore —
   *  every generated link/replace target is built against it, never a hardcoded production path,
   *  so the exact same shell can run unauthenticated in the e2e preview sandbox. */
  basePath: string;
};

export function VnextExploreShell({ data, initialPresent, basePath }: Props) {
  const router = useRouter();
  const [present, setPresent] = useState(initialPresent);
  const stageRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useVnextFullscreen(stageRef);

  // Keep in sync with the server-resolved value across Back/Forward — a mere query change
  // does not remount this client component, so a plain useState(initialPresent) alone can go stale.
  useEffect(() => {
    setPresent(initialPresent);
  }, [initialPresent]);

  const togglePresent = useCallback(() => {
    const next = !present;
    setPresent(next);
    router.replace(
      vnextExploreHref(basePath, {
        rep: data.activeRepresentation,
        source: data.activeSourceId,
        present: next,
      }),
      { scroll: false },
    );
  }, [present, router, basePath, data.activeRepresentation, data.activeSourceId]);

  useEffect(() => {
    if (!present) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") togglePresent();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [present, togglePresent]);

  // The route layout's client/project nav bars are rendered outside this component and are only
  // visually covered by the fixed overlay above — without this they stay in the tab order and the
  // accessibility tree while "hidden" behind the presentation, so keyboard/screen-reader users could
  // still reach dead chrome. `inert` removes them from both until presentation mode ends.
  useEffect(() => {
    if (!present) return;
    const covered = document.querySelectorAll<HTMLElement>(
      'header, nav[aria-label="Client"], nav[aria-label="Owner"], nav[aria-label="Project"]',
    );
    covered.forEach((el) => el.setAttribute("inert", ""));
    return () => covered.forEach((el) => el.removeAttribute("inert"));
  }, [present]);

  const hasAnyRepresentation = data.availableRepresentations.length > 0;
  const activeSources = data.activeRepresentation
    ? (data.sourcesByRepresentation[data.activeRepresentation] ?? [])
    : [];

  return (
    <div
      className={
        present
          ? // Fixed full-viewport overlay: presentation mode must hide the persistent project nav
            // rendered by the route layout above this component, not just grow within the flow.
            "fixed inset-0 z-40 flex w-full flex-col bg-[var(--vnext-canvas)]"
          : "vnext-portfolio mx-auto flex w-full flex-col px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      }
      data-vnext-explore={data.projectId}
      data-vnext-explore-present={present ? "true" : "false"}
    >
      {!present ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={data.overviewHref}
              className="text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)] no-underline"
            >
              ← {data.projectName}
            </Link>
            <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
              Explore
            </h1>
          </div>
          {data.activeRepresentation ? (
            <details className="relative" data-vnext-explore-help="true">
              <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center border border-[var(--vnext-line)] text-[var(--vnext-ink-muted)]">
                <HelpCircle className="h-4 w-4" aria-hidden />
                <span className="sr-only">Help</span>
              </summary>
              <p className="absolute right-0 z-20 mt-2 w-64 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-3 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-secondary)] shadow-[var(--vnext-shadow)]">
                {VNEXT_EXPLORE_HELP[data.activeRepresentation]}
              </p>
            </details>
          ) : null}
        </div>
      ) : null}

      {!hasAnyRepresentation ? (
        <VnextExploreEmptyState overviewHref={data.overviewHref} />
      ) : (
        <>
          {!present ? (
            <VnextRepresentationSelector
              basePath={basePath}
              available={data.availableRepresentations}
              active={data.activeRepresentation}
              present={present}
            />
          ) : null}

          {!present && data.activeRepresentation ? (
            <VnextExploreSourcePicker
              basePath={basePath}
              representation={data.activeRepresentation}
              sources={activeSources}
              activeSourceId={data.activeSourceId}
              present={present}
            />
          ) : null}

          <div
            ref={stageRef}
            className={`relative w-full overflow-hidden ${present ? "min-h-0 flex-1" : "mt-3 h-[60vh] min-h-[360px]"}`}
            data-vnext-explore-stage="true"
          >
            {data.activeRepresentation && data.activeSourceData ? (
              <>
                <VnextExploreViewerStage representation={data.activeRepresentation} data={data.activeSourceData} />
                <VnextExploreViewerControls
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
                  present={present}
                  onTogglePresent={togglePresent}
                />
              </>
            ) : (
              <VnextExploreErrorState
                message={data.activeSourceError ?? "This representation could not be loaded right now."}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
