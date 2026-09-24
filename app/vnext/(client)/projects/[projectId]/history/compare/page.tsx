import { notFound } from "next/navigation";
import { VnextHistoryCompare } from "@/components/vnext/history/VnextHistoryCompare";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import { comparableReps } from "@/lib/vnext/history/history-rules";
import { loadVnextProjectHistory } from "@/lib/vnext/history/load-project-history";
import type { VnextCompareRep } from "@/lib/vnext/history/history-types";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ a?: string; b?: string; rep?: string }>;
};

export const metadata = { title: "Compare — Slate360" };

export default async function VnextHistoryComparePage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const search = new URLSearchParams();
  if (query.a) search.set("a", query.a);
  if (query.b) search.set("b", query.b);
  if (query.rep) search.set("rep", query.rep);
  const path = `/vnext/projects/${projectId}/history/compare${search.size ? `?${search.toString()}` : ""}`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();
  const result = await loadVnextProjectHistory(ctx.user.id, projectId);
  if (result.access !== "ok" || !result.canCompare) notFound();
  if (result.error) {
    return (
      <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
        <VnextOverviewErrorNotice message={result.error} />
      </div>
    );
  }
  const earlier = result.visits.find((visit) => visit.id === query.a);
  const later = result.visits.find((visit) => visit.id === query.b);
  if (!earlier || !later || earlier.id === later.id) notFound();
  const reps = comparableReps(earlier, later);
  const requested = query.rep as VnextCompareRep | undefined;
  const rep = requested && reps.includes(requested) ? requested : (reps[0] ?? null);
  return (
    <VnextHistoryCompare
      earlier={earlier}
      later={later}
      historyHref={`/vnext/projects/${projectId}/history`}
      rep={rep}
    />
  );
}
