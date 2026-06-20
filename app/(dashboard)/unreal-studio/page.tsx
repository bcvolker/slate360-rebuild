import { listDesignSessions } from "@/lib/design-studio/internal-queries";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { DesignStudioWorkspace } from "@/components/design-studio/internal/DesignStudioWorkspace";

// Server entry: load the CEO's sessions, hand them to the no-scroll client workspace.
export default async function DesignStudioPage() {
  const { orgId } = await resolveServerOrgContext();
  const sessions = orgId ? await listDesignSessions(orgId) : [];
  return <DesignStudioWorkspace initialSessions={sessions} />;
}
