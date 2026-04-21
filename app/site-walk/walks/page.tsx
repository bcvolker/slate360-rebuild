import { redirect } from "next/navigation";
import { Footprints } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { createAdminClient } from "@/lib/supabase/admin";
import WalksClient from "./WalksClient";

export const metadata = { title: "Walks — Site Walk" };
export const dynamic = "force-dynamic";

export default async function WalksPage() {
  let ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/site-walk/walks");

  // Auto-provision a personal organization on first visit so beta testers
  // never get stuck on a "join an organization" wall. Mirrors the pattern in
  // app/(dashboard)/dashboard/page.tsx.
  if (!ctx.orgId) {
    try {
      await ensureUserOrganization(ctx.user);
      ctx = await resolveServerOrgContext();
    } catch (error) {
      console.error("[site-walk/walks] org bootstrap failed", error);
    }
  }

  if (!ctx.orgId) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        <Footprints className="h-10 w-10 mx-auto mb-3 text-slate-500" />
        We couldn&apos;t set up your workspace automatically. Refresh the page,
        and if this keeps happening, contact support@slate360.ai.
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: projects } = await admin
    .from("projects")
    .select("id, name")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return <WalksClient initialProjects={projects ?? []} />;
}
