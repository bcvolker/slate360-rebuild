import { notFound } from "next/navigation";
import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { VNEXT_HISTORY_SCAFFOLD_NOTE } from "@/lib/vnext/copy";
import { loadClientProjectScaffold } from "@/lib/vnext/load-client-portfolio";
import { decideVnextProjectRecordAccess, isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export const metadata = {
  title: "History — Slate360",
};

export default async function VnextProjectHistoryPage({ params }: PageProps) {
  const { projectId } = await params;
  const path = `/vnext/projects/${projectId}/history`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const project = await loadClientProjectScaffold(ctx.user.id, projectId);
  if (!project || decideVnextProjectRecordAccess(project) !== "allow") notFound();

  return <VnextPageScaffold title="History" note={VNEXT_HISTORY_SCAFFOLD_NOTE} />;
}
