import Link from "next/link";
import { ProjectWalkthroughLibrary } from "@/components/spatial-walkthrough/ProjectWalkthroughLibrary";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveSpatialAccess } from "@/lib/spatial-walkthrough/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDirectedTourEnabled } from "@/lib/spatial-experience/portal-package-load";

export default async function ProjectWalkthroughsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { orgId, isSlateCeo, isAdmin } = await resolveServerOrgContext();
  const access = await resolveSpatialAccess(orgId, Boolean(isSlateCeo), Boolean(isAdmin));
  const tour = Boolean(orgId) && access.canAuthor && (await loadDirectedTourEnabled(createAdminClient(), orgId!));
  return (
    <div className="space-y-5">
      {tour ? (
        <Link href={`/projects/${projectId}/tour`} className={`${t.sectionCard} flex items-center justify-between gap-3`} data-testid="open-directed-tour">
          <span className="min-w-0">
            <span className={`${t.eyebrow} block`}>Directed Tour</span>
            <span className="block text-sm text-[var(--graphite-muted)]">Route, checkpoints and visits clients compare</span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-[var(--graphite-primary)]">Open</span>
        </Link>
      ) : null}
      <ProjectWalkthroughLibrary projectId={projectId} />
    </div>
  );
}
