import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { DeliverableEditorClient } from "@/components/site-walk/reports/DeliverableEditorClient";

/**
 * Desktop deliverable editor route (REPORT-001).
 * /projects/[projectId]/deliverables/[deliverableId]/edit
 */
export default async function DeliverableEditPage({
  params,
}: {
  params: Promise<{ projectId: string; deliverableId: string }>;
}) {
  const { projectId, deliverableId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) {
    redirect(`/login?redirectTo=/projects/${projectId}/deliverables/${deliverableId}/edit`);
  }
  return <DeliverableEditorClient projectId={projectId} deliverableId={deliverableId} />;
}
