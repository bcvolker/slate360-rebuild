import { DashboardV3Shell } from "@/components/dashboard-v3/DashboardV3Shell";
import { resolveServerOrgContext } from "@/lib/server/api-auth";
import { resolveUsageTruth } from "@/lib/server/usage-truth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard V3 Preview",
};

export default async function DashboardV3PreviewPage() {
  // 1. Auth context
  const { org_id, user_id, canAccessCeo, canAccessMarket, role } = await resolveServerOrgContext();
  if (!org_id) {
    return <div className="p-8 text-white">No active organization found.</div>;
  }

  // 2. Initial Setup
  const supabase = createServerSupabaseClient();
  const usage = await resolveUsageTruth({ org_id, supabase });

  // 3. Simple Real Data Fetches
  // Latest Project
  const { data: latestProjects } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .limit(1);
    
  const latestProject = latestProjects?.[0] || null;

  // Alerts
  const { data: alarms } = await supabase
    .from("project_notifications")
    .select("id, message, severity, created_at")
    .eq("org_id", org_id)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: processingJobs } = await supabase
    .from("slatedrop_uploads")
    .select("id, filename, status, processing_progress, created_at")
    .eq("org_id", org_id)
    .neq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent Walks
  const { data: recentWalks } = await supabase
    .from("site_walk_sessions")
    .select("id, name, created_at")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .limit(3);

  // 4. Assemble Data
  const data = {
    roleName: role === "ceo" || role === "admin" ? "Admin" : "Member",
    alerts: alarms || [],
    latestProject,
    recentProjects: latestProjects || [],
    recentWalks: recentWalks || [],
    myWork: latestProjects || [],
    coordinationAlerts: alarms || [],
    processingJobs: processingJobs || [],
    usage: {
      storageGbUsed: usage.totalSizeGb.toFixed(2),
      storageGbLimit: 10, // Assuming static limit for UI
    }
  };

  return <DashboardV3Shell data={data} />;
}
