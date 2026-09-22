import { notFound } from "next/navigation";
import { VnextItemDetail } from "@/components/vnext/items/VnextItemDetail";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import { loadVnextItemDetail } from "@/lib/vnext/items/load-project-items";
import { vnextProjectHref } from "@/lib/vnext/nav";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string; itemId: string }>;
};

export const metadata = {
  title: "Item — Slate360",
};

export default async function VnextProjectItemPage({ params }: PageProps) {
  const { projectId, itemId } = await params;
  const path = `/vnext/projects/${projectId}/items/${itemId}`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const result = await loadVnextItemDetail(ctx.user.id, projectId, itemId);
  if (result.access === "denied" || result.access === "missing") notFound();
  if (result.access === "error") return <VnextOverviewErrorNotice message={result.message} />;

  return (
    <VnextItemDetail
      item={result.item}
      itemsHref={`/vnext/projects/${projectId}/items`}
      exploreBase={`${vnextProjectHref(projectId)}/explore`}
      questions={result.questions}
      endpoint={`/api/vnext/projects/${projectId}/items/${itemId}/questions`}
    />
  );
}
