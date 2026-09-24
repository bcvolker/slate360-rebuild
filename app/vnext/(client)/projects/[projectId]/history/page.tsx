import { notFound } from "next/navigation";
import { VnextHistoryBrowser } from "@/components/vnext/history/VnextHistoryBrowser";
import { loadVnextProjectHistory } from "@/lib/vnext/history/load-project-history";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = { params: Promise<{ projectId: string }> };

export const metadata = { title: "History — Slate360" };

export default async function VnextProjectHistoryPage({ params }: PageProps) {
  const { projectId } = await params;
  const path = `/vnext/projects/${projectId}/history`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();
  const result = await loadVnextProjectHistory(ctx.user.id, projectId);
  if (result.access !== "ok") notFound();
  return (
    <VnextHistoryBrowser
      visits={result.visits}
      historyBase={path}
      error={result.error}
      allowCompare={result.canCompare}
    />
  );
}
