import { notFound } from "next/navigation";
import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { loadExploreItemFocus } from "@/lib/vnext/items/load-project-items";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import { loadVnextExploreData } from "@/lib/vnext/load-project-explore";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { userCanManageVnextProject } from "@/lib/vnext/plans/manage-access";
import { readSavedViews } from "@/lib/vnext/views/read-saved-views";
import type { SavedViewAspect } from "@/lib/vnext/views/saved-view-types";
import type { VnextExploreData } from "@/lib/vnext/explore-types";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ rep?: string; source?: string; item?: string; present?: string; view?: string; guide?: string }>;
};

const GUIDES = new Set<SavedViewAspect>(["16:9", "9:16", "1:1"]);

export const metadata = { title: "Explore — Slate360" };

export default async function VnextProjectExplorePage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const path = `/vnext/projects/${projectId}/explore`;
  const requestedRep = query.rep?.trim() || null;
  const requestedSourceId = query.source?.trim() || null;
  const requestedItem = query.item?.trim() || null;
  const requestedView = query.view?.trim() || null;
  const present = query.present === "1";
  const guide = query.guide && GUIDES.has(query.guide as SavedViewAspect) ? (query.guide as SavedViewAspect) : null;

  const redirectTo = vnextExploreHref(path, {
    rep: requestedRep,
    source: requestedSourceId,
    item: requestedItem,
    view: requestedView,
    guide,
    present,
  });
  const ctx = await requireVnextSession(redirectTo);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const scoped = await getScopedProjectForUser(ctx.user.id, projectId, "id, org_id");
  const listed = scoped.project ? await readSavedViews(scoped.admin, projectId) : { views: [], failed: false };
  const opened = requestedView ? listed.views.find((view) => view.id === requestedView) ?? null : null;
  const data = await loadVnextExploreData(
    ctx.user.id,
    projectId,
    opened ? opened.representation : requestedView ? null : requestedRep,
    opened ? opened.sourceId : requestedView ? null : requestedSourceId,
  );
  if (!data) notFound();

  const resolved = Boolean(opened && data.activeRepresentation === opened.representation && data.activeSourceId === opened.sourceId && data.activeSourceData);
  const unavailable = Boolean(requestedView) && !resolved;
  const shown: VnextExploreData = unavailable
    ? { ...data, activeRepresentation: null, activeSourceId: null, activeSourceData: null, activeSourceError: null }
    : data;
  const itemId = opened && resolved ? opened.itemId : unavailable ? null : requestedItem;
  const itemFocus = itemId
    ? await loadExploreItemFocus(ctx.user.id, projectId, itemId, shown.activeRepresentation, shown.activeSourceId)
    : null;
  const orgId = (scoped.project as { org_id?: string | null } | null)?.org_id ?? scoped.orgId ?? null;
  const canWrite = scoped.project ? await userCanManageVnextProject(scoped.admin, ctx.user.id, projectId, orgId) : false;

  return (
    <VnextExploreShell
      data={shown}
      initialPresent={present}
      basePath={path}
      item={itemId}
      itemFocus={itemFocus}
      views={listed.views}
      viewsFailed={listed.failed}
      canWrite={canWrite}
      openedView={resolved ? opened : null}
      viewId={requestedView}
      viewUnavailable={unavailable}
      guide={opened?.aspect ?? guide}
      persistViews="api"
    />
  );
}
