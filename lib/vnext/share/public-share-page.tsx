import "server-only";

import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { VnextHistoryBrowser } from "@/components/vnext/history/VnextHistoryBrowser";
import { VnextHistoryCompare } from "@/components/vnext/history/VnextHistoryCompare";
import { VnextHistoryVisit } from "@/components/vnext/history/VnextHistoryVisit";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import { VnextRoot } from "@/components/vnext/VnextRoot";
import { VnextPublicOverview } from "@/components/vnext/share/VnextPublicOverview";
import { VnextPublicShell } from "@/components/vnext/share/VnextPublicShell";
import { VnextShareUnavailable } from "@/components/vnext/share/VnextShareUnavailable";
import { comparableReps } from "@/lib/vnext/history/history-rules";
import type { VnextCompareRep } from "@/lib/vnext/history/history-types";
import { loadPublicExplore } from "./load-public-explore";
import { loadPublicHistory } from "./load-public-history";
import { claimResolvedShare, exploreRepresentation, resolvePublicShare } from "./resolve-public-share";
import { sharePath } from "./share-rules";

type Section = "overview" | "explore" | "history" | "visit" | "compare";

type Query = { rep?: string; source?: string; present?: string; visitId?: string; a?: string; b?: string };

export async function renderPublicShare(token: string, section: Section, query: Query = {}) {
  const { admin, share } = await resolvePublicShare(token);
  if (share.state !== "active") return <VnextShareUnavailable />;
  const root = sharePath(token);
  if (share.target === "saved_view" && share.view) {
    const representation = exploreRepresentation(share.view);
    if (!representation) return <VnextShareUnavailable />;
    const data = await loadPublicExplore(admin, { id: share.projectId, name: share.projectName }, token, null, null, {
      representation,
      sourceId: share.view.sourceId,
    });
    if (!data) return <VnextShareUnavailable />;
    if (!(await claimResolvedShare(admin, token))) return <VnextShareUnavailable />;
    return (
      <VnextRoot>
        <VnextPublicShell token={token} projectName={share.projectName} sections={[]} pathname={root}>
          <VnextExploreShell
            data={data}
            initialPresent={query.present === "1"}
            basePath={`${root}/explore`}
            item={null}
            canWrite={false}
            openedView={share.view}
            viewId={share.view.id}
            showViews={false}
            persistViews="local"
          />
        </VnextPublicShell>
      </VnextRoot>
    );
  }
  if (share.target !== "project") return <VnextShareUnavailable />;
  if (section === "explore" && !share.sections.includes("explore")) return <VnextShareUnavailable />;
  if ((section === "history" || section === "visit" || section === "compare") && !share.sections.includes("history")) {
    return <VnextShareUnavailable />;
  }
  const history = section === "history" || section === "visit" || section === "compare" ? await loadPublicHistory(admin, share.projectId, token) : null;
  if (history === null && section !== "overview" && section !== "explore") return <VnextShareUnavailable />;
  if (section === "compare" && !history?.canCompare) return <VnextShareUnavailable />;
  if (section === "visit" && !history?.visits.some((visit) => visit.id === query.visitId)) return <VnextShareUnavailable />;
  if (section === "compare") {
    const earlier = history?.visits.find((visit) => visit.id === query.a);
    const later = history?.visits.find((visit) => visit.id === query.b);
    if (!earlier || !later || earlier.id === later.id) return <VnextShareUnavailable />;
  }
  const exploreData =
    section === "explore"
      ? await loadPublicExplore(
          admin,
          { id: share.projectId, name: share.projectName },
          token,
          query.rep ?? null,
          query.source ?? null,
          null,
        )
      : null;
  if (section === "explore" && !exploreData) return <VnextShareUnavailable />;
  if (!(await claimResolvedShare(admin, token))) return <VnextShareUnavailable />;

  let body = (
    <VnextPublicOverview
      projectName={share.projectName}
      exploreHref={`${root}/explore`}
      historyHref={`${root}/history`}
      sections={share.sections}
    />
  );
  if (section === "explore" && exploreData) {
    body = (
      <VnextExploreShell
        data={exploreData}
        initialPresent={query.present === "1"}
        basePath={`${root}/explore`}
        item={null}
        canWrite={false}
        showViews={false}
        persistViews="local"
      />
    );
  }
  if (section === "history" && history) {
    body = <VnextHistoryBrowser visits={history.visits} historyBase={`${root}/history`} error={history.error} allowCompare={history.canCompare} />;
  }
  if (section === "visit" && history) {
    const visit = history.visits.find((entry) => entry.id === query.visitId);
    body = visit ? (
      <VnextHistoryVisit visit={visit} historyHref={`${root}/history`} />
    ) : (
      <VnextOverviewErrorNotice message="This link is not available." />
    );
  }
  if (section === "compare" && history) {
    const earlier = history.visits.find((visit) => visit.id === query.a);
    const later = history.visits.find((visit) => visit.id === query.b);
    if (earlier && later) {
      const reps = comparableReps(earlier, later).filter(
        (rep): rep is Exclude<VnextCompareRep, "thermal"> => rep !== "thermal",
      );
      const rep = reps.find((entry) => entry === query.rep) ?? reps[0] ?? null;
      body = <VnextHistoryCompare earlier={earlier} later={later} historyHref={`${root}/history`} rep={rep} />;
    }
  }
  const pathname = section === "overview" ? root : section === "explore" ? `${root}/explore` : `${root}/history`;
  return (
    <VnextRoot>
      <VnextPublicShell token={token} projectName={share.projectName} sections={share.sections} pathname={pathname}>
        {body}
      </VnextPublicShell>
    </VnextRoot>
  );
}
