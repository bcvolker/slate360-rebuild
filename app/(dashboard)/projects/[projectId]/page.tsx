import { notFound, redirect } from "next/navigation";
import { ProjectOverviewTab } from "@/components/projects/ProjectOverviewTab";
import { ClientProjectPackage } from "@/components/dashboard-desktop/ClientProjectPackage";
import { loadProjectOverviewData } from "@/lib/projects/load-project-overview-data";
import { loadClientProject } from "@/lib/dashboard/load-client-project";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveClientSurfaceFlags } from "@/lib/spatial-walkthrough/access";
import { isSpatialOnlyPortal } from "@/lib/spatial-walkthrough/client-surface";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, orgId, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${projectId}`)}`);

  const flags = await resolveClientSurfaceFlags(orgId, Boolean(isSlateCeo));
  if (isSpatialOnlyPortal(flags) && orgId) {
    const data = await loadClientProject({ projectId, orgId, userId: user.id });
    if (!data) notFound();
    return <ClientProjectPackage data={data} />;
  }

  const data = await loadProjectOverviewData(projectId);
  return <ProjectOverviewTab data={data} />;
}
