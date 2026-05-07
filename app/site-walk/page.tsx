import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteWalkHub } from "./_components/SiteWalkHub";

export default async function SiteWalkPage() {
  const context = await resolveServerOrgContext();
  let projects: Array<{ id: string; name: string }> = [];

  if (context.orgId) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("projects")
        .select("id, name")
        .eq("org_id", context.orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);
      projects = (data ?? []) as Array<{ id: string; name: string }>;
    } catch (error) {
      console.error("Site Walk project list failed", error);
    }
  }

  // Mock data for walks to satisfy the UI requirement in the roadmap phase
  const walks = [
    { id: "1", name: "Safety Inspection", date: "Oct 24, 2025", project: "Alpha Site", status: "in_progress" },
    { id: "2", name: "Punch List", date: "Oct 22, 2025", project: "Beta Site", status: "completed" },
  ];

  return (
      <main className="min-h-[calc(100dvh-96px)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] px-3 py-3 pb-24 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-full max-w-6xl items-start">
        <SiteWalkHub projects={projects} walks={walks} reports={[]} tier={context.tier} />
      </div>
    </main>
  );
}
