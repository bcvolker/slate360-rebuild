import { notFound } from "next/navigation";
import { VnextProjectScaffold } from "@/components/vnext/portfolio/VnextProjectScaffold";
import { isVnextProjectId, decideVnextProjectRecordAccess } from "@/lib/vnext/portfolio-access";
import { loadClientProjectScaffold } from "@/lib/vnext/load-client-portfolio";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export const metadata = {
  title: "Project — Slate360",
};

export default async function VnextProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  const path = `/vnext/projects/${projectId}`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const project = await loadClientProjectScaffold(ctx.user.id, projectId);
  if (!project || decideVnextProjectRecordAccess(project) !== "allow") notFound();

  return <VnextProjectScaffold name={project.name} />;
}
