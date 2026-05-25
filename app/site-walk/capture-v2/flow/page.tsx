import { notFound } from "next/navigation";
import { CaptureFlowClient } from "@/components/site-walk-v2/CaptureFlowClient";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

const SAMPLE_STOPS = [
  { id: "stop-entry", label: "Entry", complete: false },
  { id: "stop-l2", label: "Level 2", complete: false },
  { id: "stop-roof", label: "Roof deck", complete: false },
] as const;

type Props = {
  searchParams?: Promise<{ session?: string }>;
};

export default async function CaptureFlowPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const sessionId = params.session?.trim();
  if (!sessionId) notFound();

  const context = await resolveServerOrgContext();
  if (!context.user || !context.orgId) notFound();

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("site_walk_sessions")
    .select("id, project_id, status")
    .eq("id", sessionId)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (!session) notFound();

  return (
    <main className="relative flex h-full min-h-0 w-full flex-grow flex-col overflow-hidden bg-[#0B0F15] text-slate-50">
      <CaptureFlowClient
        sessionId={session.id}
        projectId={session.project_id}
        stopIndex={0}
        stops={[...SAMPLE_STOPS]}
      />
    </main>
  );
}
