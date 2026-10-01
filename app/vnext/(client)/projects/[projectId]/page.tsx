import { notFound } from "next/navigation";
import { VnextProjectOverview } from "@/components/vnext/project/VnextProjectOverview";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { loadVnextProjectOverview } from "@/lib/vnext/load-project-overview";
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

  const { overview, error } = await loadVnextProjectOverview(ctx.user.id, projectId);
  if (!overview) notFound();

  return <VnextProjectOverview overview={overview} loadError={error} />;
}
