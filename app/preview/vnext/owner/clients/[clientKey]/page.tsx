import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { VnextOwnerClientDetail } from "@/components/vnext/owner/VnextOwnerClients";
import { clientGroupKey, projectsForClient } from "@/lib/vnext/owner/clients";
import { previewOwnerWorkspace } from "@/lib/vnext/owner/preview-owner";

export default async function PreviewOwnerClientPage({ params }: { params: Promise<{ clientKey: string }> }) {
  const { clientKey } = await params;
  const workspace = previewOwnerWorkspace();
  const projects = projectsForClient(workspace.projects, clientKey);
  const name = workspace.clients.find((client) => client.key === clientGroupKey(clientKey))?.name ?? projects[0]?.clientName ?? "Client";
  return (
    <VnextOwnerShell pathname="/vnext/ops/clients">
      <VnextOwnerClientDetail name={name} projects={projects} />
    </VnextOwnerShell>
  );
}
