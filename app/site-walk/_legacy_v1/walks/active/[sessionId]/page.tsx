import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import CaptureClient from "./CaptureClient";

export const metadata = { title: "Capture — Site Walk" };
export const dynamic = "force-dynamic";

type Params = { sessionId: string };

export default async function ActiveSessionPage({ params }: { params: Promise<Params> }) {
  const { sessionId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/walks/active/${sessionId}`);
  if (!ctx.orgId) redirect("/site-walk/walks");

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("site_walk_sessions")
    .select("id, title, status, project_id")
    .eq("id", sessionId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!session) notFound();

  return <CaptureClient sessionId={session.id} title={session.title} />;
}
