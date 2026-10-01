import "server-only";

import { notFound } from "next/navigation";

import { VnextOwnerHome } from "@/components/vnext/owner/VnextOwnerHome";
import { VnextOwnerClientDetail, VnextOwnerClients } from "@/components/vnext/owner/VnextOwnerClients";
import { VnextOwnerProjects } from "@/components/vnext/owner/VnextOwnerProjects";
import { VnextOwnerProjectDetail } from "@/components/vnext/owner/VnextOwnerProjectDetail";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";
import { clientGroupKey, projectsForClient } from "@/lib/vnext/owner/clients";
import { loadOwnerProjectDetail, loadOwnerWorkspace } from "@/lib/vnext/owner/load-owner-workspace";

function ownerUserId(user: { id: string } | null): string {
  if (!user) notFound();
  return user.id;
}

export async function VnextOpsHomePage() {
  const ctx = await requireVnextOwner("/vnext/ops");
  const workspace = await loadOwnerWorkspace(ownerUserId(ctx.user));
  return <VnextOwnerHome attention={workspace.attention} projects={workspace.projects} error={workspace.error} />;
}

export async function VnextOpsClientsPage() {
  const ctx = await requireVnextOwner("/vnext/ops/clients");
  const workspace = await loadOwnerWorkspace(ownerUserId(ctx.user));
  return <VnextOwnerClients clients={workspace.clients} error={workspace.error} />;
}

export async function VnextOpsClientDetailPage({ clientKey }: { clientKey: string }) {
  const ctx = await requireVnextOwner(`/vnext/ops/clients/${clientKey}`);
  const workspace = await loadOwnerWorkspace(ownerUserId(ctx.user));
  const projects = projectsForClient(workspace.projects, clientKey);
  const key = clientGroupKey(clientKey) ?? clientKey;
  const name = workspace.clients.find((client) => client.key === key)?.name ?? projects[0]?.clientName ?? "Client";
  return <VnextOwnerClientDetail name={name} projects={projects} />;
}

export async function VnextOpsProjectsPage({
  q,
  client,
  attention,
}: {
  q?: string;
  client?: string;
  attention?: string;
}) {
  const ctx = await requireVnextOwner("/vnext/ops/projects");
  const workspace = await loadOwnerWorkspace(ownerUserId(ctx.user));
  return (
    <VnextOwnerProjects
      projects={workspace.projects}
      error={workspace.error}
      initialQuery={q ?? ""}
      initialClient={client ?? ""}
      initialAttention={attention === "1"}
    />
  );
}

export async function VnextOpsProjectDetailPage({ projectId }: { projectId: string }) {
  const ctx = await requireVnextOwner(`/vnext/ops/projects/${projectId}`);
  const detail = await loadOwnerProjectDetail(ownerUserId(ctx.user), projectId);
  if (!detail) return <VnextOwnerProjectDetail project={null} included={[]} canWrite={false} persist="api" error="This project is not available." />;
  return (
    <VnextOwnerProjectDetail
      project={detail.project}
      included={detail.included}
      canWrite={detail.canWrite}
      persist="api"
      error={detail.error}
    />
  );
}
