import { notFound } from "next/navigation";
import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_EXPLORE_SCAFFOLD_NOTE } from "@/lib/vnext/copy";
import { loadClientProjectScaffold } from "@/lib/vnext/load-client-portfolio";
import { decideVnextProjectRecordAccess, isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export const metadata = {
  title: "Explore — Slate360",
};

export default async function VnextProjectExplorePage({ params }: PageProps) {
  const { projectId } = await params;
  const path = `/vnext/projects/${projectId}/explore`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const project = await loadClientProjectScaffold(ctx.user.id, projectId);
  if (!project || decideVnextProjectRecordAccess(project) !== "allow") notFound();

  return <VnextPageScaffold title="Explore" note={VNEXT_EXPLORE_SCAFFOLD_NOTE} />;
}
