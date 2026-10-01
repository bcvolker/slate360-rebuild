import { VnextProjectNav } from "@/components/vnext/project/VnextProjectNav";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { loadPortfolioEvidence } from "@/lib/vnext/load-portfolio-evidence";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { projectNavForScope } from "@/lib/vnext/scope/filter-client-surface";
import { readClientScope } from "@/lib/vnext/scope/read-project-scope";
import { resolveServerOrgContext } from "@/lib/server/org-context";

type Props = { projectId: string };

/** Project tabs follow the delivery scope. A signed-out request keeps the full list only until the page redirects. */
export async function VnextScopedProjectNav({ projectId }: Props) {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user || !isVnextProjectId(projectId)) {
    return <VnextProjectNav projectId={projectId} />;
  }
  const { admin, project } = await getScopedProjectForUser(ctx.user.id, projectId, "id");
  if (!project) return <VnextProjectNav projectId={projectId} />;
  const [scope, evidence] = await Promise.all([
    readClientScope(admin, projectId),
    loadPortfolioEvidence(admin, [projectId]),
  ]);
  const items = projectNavForScope(projectId, scope, evidence[projectId]?.representations ?? []);
  return <VnextProjectNav projectId={projectId} items={items} />;
}
