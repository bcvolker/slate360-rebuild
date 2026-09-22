import { notFound } from "next/navigation";
import { VnextHistoryVisit } from "@/components/vnext/history/VnextHistoryVisit";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import { loadVnextProjectHistory } from "@/lib/vnext/history/load-project-history";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = { params: Promise<{ projectId: string; visitId: string }> };

export const metadata = { title: "Visit — Slate360" };

export default async function VnextHistoryVisitPage({ params }: PageProps) {
  const { projectId, visitId } = await params;
  const path = `/vnext/projects/${projectId}/history/${visitId}`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();
  const result = await loadVnextProjectHistory(ctx.user.id, projectId);
  if (result.access === "denied") notFound();
  if (result.error) {
    return (
      <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
        <VnextOverviewErrorNotice message={result.error} />
      </div>
    );
  }
  const visit = result.visits.find((entry) => entry.id === visitId);
  if (!visit) notFound();
  return <VnextHistoryVisit visit={visit} historyHref={`/vnext/projects/${projectId}/history`} />;
}
