import { redirect } from "next/navigation";
import { Footprints } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import WalksClient from "./WalksClient";

export const metadata = { title: "Walks — Site Walk" };
export const dynamic = "force-dynamic";

export default async function WalksPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/site-walk/walks");
  if (!ctx.orgId) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        <Footprints className="h-10 w-10 mx-auto mb-3 text-slate-500" />
        Join or create an organization to start a walk.
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
