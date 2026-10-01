"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { resolvePreviewExploreData } from "@/lib/vnext/preview-explore-fixtures";
import { resolvePreviewItemFocus } from "@/lib/vnext/preview-items-fixtures";
import {
  PREVIEW_OVERVIEW_NAV_PATH,
  PREVIEW_OVERVIEW_PROJECT,
  PREVIEW_PROJECT_NAV_ITEMS,
} from "@/lib/vnext/preview-overview-fixtures";
import { PREVIEW_PATH, PREVIEW_SAVED_VIEWS, applyPreviewSavedView, previewViewsForScope } from "@/lib/vnext/views/preview-saved-views";
import type { SavedViewAspect, VnextSavedView } from "@/lib/vnext/views/saved-view-types";

const BASE_PATH = "/preview/vnext/project/explore";
const ASPECTS = new Set(["16:9", "9:16", "1:1"]);

export default function PreviewVnextProjectExplorePage() {
  const searchParams = useSearchParams();
  const scopeId = searchParams?.get("scope") ?? null;
  const list = searchParams?.get("list") ?? null;
  const viewId = searchParams?.get("view");
  const [views, setViews] = useState<VnextSavedView[]>(() => previewViewsForScope(scopeId, list === "empty"));

  useEffect(() => {
    setViews(previewViewsForScope(scopeId, list === "empty"));
  }, [scopeId, list]);

  const known = (viewId && (views.find((view) => view.id === viewId) ?? PREVIEW_SAVED_VIEWS.find((view) => view.id === viewId))) || null;
  const base = resolvePreviewExploreData(searchParams?.get("rep") ?? null, searchParams?.get("source") ?? null, scopeId);
  const applied = known ? applyPreviewSavedView(known, scopeId) : null;
  const unavailable = Boolean(viewId) && (!applied || applied.unavailable);
  const data = unavailable
    ? { ...base, activeRepresentation: null, activeSourceId: null, activeSourceData: null, activeSourceError: null }
    : (applied?.data ?? base);
  const present = searchParams?.get("present") === "1";
  const guideParam = searchParams?.get("guide");
  const guide = guideParam && ASPECTS.has(guideParam) ? (guideParam as SavedViewAspect) : null;
  const item = !unavailable && known?.itemId ? known.itemId : (searchParams?.get("item") ?? null);
  const itemFocus = resolvePreviewItemFocus(item, data.activeRepresentation, data.activeSourceId);
  const setup = searchParams?.get("setup") === "1" && data.activeRepresentation === "reality";

  return (
    <VnextClientShell pathname={PREVIEW_OVERVIEW_NAV_PATH}>
      <VnextProjectNav
        projectId={PREVIEW_OVERVIEW_PROJECT.id}
        pathname={PREVIEW_PROJECT_NAV_ITEMS[1].href}
        items={PREVIEW_PROJECT_NAV_ITEMS}
      />
      <VnextExploreShell
        data={data}
        initialPresent={present}
        basePath={BASE_PATH}
        item={item}
        itemFocus={itemFocus}
        views={views}
        canWrite
        openedView={unavailable ? null : known}
        viewId={viewId}
        viewUnavailable={unavailable}
        guide={guide}
        persistViews="local"
        onViews={setViews}
        pathModelId={setup ? known?.sourceId ?? "preview-reality" : null}
        initialPath={setup ? PREVIEW_PATH : null}
      />
    </VnextClientShell>
  );
}
