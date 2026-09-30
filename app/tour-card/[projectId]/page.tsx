import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveSpatialAccess } from "@/lib/spatial-walkthrough/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadDirectedTourEnabled } from "@/lib/spatial-experience/portal-package-load";
import { projectInOrg } from "@/lib/spatial-tour/route-guard";
import { loadTourBundle } from "@/lib/spatial-tour/tour-store";
import { CaptureCard } from "@/components/spatial-tour/operator/CaptureCard";
import { operatorTourUrls } from "@/lib/spatial-tour/urls";

export const metadata = { title: "Capture card — Slate360" };

/**
 * Repeat-visit capture card page. Lives outside the dashboard shell so it prints as one
 * clean sheet. Same gate as the operator Tour page.
 */
export default async function CaptureCardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, orgId, isSlateCeo, isAdmin } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  const access = await resolveSpatialAccess(orgId, Boolean(isSlateCeo), Boolean(isAdmin));
  const admin = createAdminClient();
  if (!orgId || !access.canAuthor || !(await loadDirectedTourEnabled(admin, orgId))) notFound();
  if (!(await projectInOrg(admin, orgId, projectId))) notFound();
  const bundle = await loadTourBundle(admin, orgId, projectId);
  const route = bundle.route;
  if (!route) notFound();

  return <CaptureCard projectId={projectId} bundle={{ ...bundle, route }} stillUrl={operatorTourUrls(projectId).still} />;
}
