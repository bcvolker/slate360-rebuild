import { notFound } from "next/navigation";
import { VnextExploreShell } from "@/components/vnext/explore/VnextExploreShell";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import { loadVnextExploreData } from "@/lib/vnext/load-project-explore";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ rep?: string; source?: string; item?: string; present?: string }>;
};

export const metadata = {
  title: "Explore — Slate360",
};

export default async function VnextProjectExplorePage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const path = `/vnext/projects/${projectId}/explore`;

  const requestedRep = query.rep?.trim() || null;
  const requestedSourceId = query.source?.trim() || null;
  const requestedItem = query.item?.trim() || null;
  const present = query.present === "1";

  // The login redirectTo must preserve the full Explore URL state (rep/source/item/present), not
  // just the bare path, so a deep link an unauthenticated visitor followed still lands where they
  // meant to go after signing in. Built via vnextExploreHref (never raw request input), so the
  // result is always exactly this authenticated /vnext/projects/[id]/explore path plus a
  // URLSearchParams-encoded query — never an external or open redirect target.
  const redirectTo = vnextExploreHref(path, {
    rep: requestedRep,
    source: requestedSourceId,
    item: requestedItem,
    present,
  });
  const ctx = await requireVnextSession(redirectTo);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const data = await loadVnextExploreData(ctx.user.id, projectId, requestedRep, requestedSourceId);
  if (!data) notFound();

  return (
    <VnextExploreShell data={data} initialPresent={present} basePath={path} item={requestedItem} />
  );
}
