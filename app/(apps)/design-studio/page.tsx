import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveProjectScope } from "@/lib/projects/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { DesignStudioShell } from "@/components/design-studio/DesignStudioShell";

export default async function DesignStudioPage() {
  // Design Studio is CEO-only and NOT part of the shippable app (Site Walk + Twin 360 only).
  // Gated like Thermal Studio so it can never be reached by a reviewer/beta/entitled user.
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/design-studio");
  if (!isSlateCeo) notFound();

  const { orgId } = await resolveProjectScope(user.id);

  // Fetch org's projects for the project selector
  const admin = createAdminClient();
  const { data: projects } = await admin
    .from("projects")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  return <DesignStudioShell projects={projects ?? []} />;
}
