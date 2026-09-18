import { notFound } from "next/navigation";
import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { loadVnextExploreData } from "@/lib/vnext/load-project-explore";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ rep?: string; source?: string; present?: string }>;
};

export const metadata = {
  title: "Explore — Slate360",
};

export default async function VnextProjectExplorePage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const path = `/vnext/projects/${projectId}/explore`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const requestedRep = query.rep?.trim() || null;
  const requestedSourceId = query.source?.trim() || null;
  const data = await loadVnextExploreData(ctx.user.id, projectId, requestedRep, requestedSourceId);
  if (!data) notFound();

  return <VnextExploreShell data={data} initialPresent={query.present === "1"} basePath={path} />;
}
