import { DashboardV3Shell } from "@/components/dashboard-v3/DashboardV3Shell";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveUsageTruth } from "@/lib/server/usage-truth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // 1. Auth context
  const { user, orgId, isSlateCeo, role } = await resolveServerOrgContext();
  if (!user) {
    redirect("/login");
  }
  
  if (!orgId) {
    return <div className="p-8 text-white">No active organization found.</div>;
  }

  // 2. Initial Setup
  const supabase = await createClient();
  let usage = null;
  try {
    usage = await resolveUsageTruth({ userId: user.id, orgId });
  } catch (error: any) {
    console.warn("[DashboardV3] usage query failed", error.message);
  }

  // 3. Simple Real Data Fetches
  let latestProjects: any[] = [];
  try {
    const res = await supabase
      .from("projects")
      .select("id, name, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1);
    latestProjects = res.data ?? [];
    if (res.error) console.warn("[DashboardV3] projects query error:", res.error.message);
  } catch (err: any) {
    console.warn("[DashboardV3] projects query failed", err.message);
  }
    
  const latestProject = latestProjects?.[0] || null;

  // Alerts
  let alarms: any[] = [];
  try {
    const res = await supabase
      .from("project_notifications")
      .select("id, message, severity, created_at")
      .eq("org_id", orgId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    alarms = res.data ?? [];
    if (res.error) console.warn("[DashboardV3] project_notifications query error:", res.error.message);
  } catch (err: any) {
    console.warn("[DashboardV3] project_notifications query failed", err.message);
  }

  let processingJobs: any[] = [];
  try {
    const res = await supabase
      .from("slatedrop_uploads")
      .select("id, filename, status, processing_progress, created_at")
      .eq("org_id", orgId)
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);
    processingJobs = res.data ?? [];
    if (res.error) console.warn("[DashboardV3] slatedrop_uploads query error:", res.error.message);
  } catch (err: any) {
    console.warn("[DashboardV3] slatedrop_uploads query failed", err.message);
  }

  // Recent Walks
  let recentWalks: any[] = [];
  try {
    const res = await supabase
      .from("site_walk_sessions")
      .select("id, name, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(3);
    recentWalks = res.data ?? [];
    if (res.error) console.warn("[DashboardV3] site_walk_sessions query error:", res.error.message);
  } catch (err: any) {
    console.warn("[DashboardV3] site_walk_sessions query failed", err.message);
  }

  // 4. Assemble Data
  const data = {
    roleName: role === "ceo" || role === "admin" || isSlateCeo ? "Admin" : "Member",
    alerts: alarms || [],
    latestProject,
    recentProjects: latestProjects || [],
    recentWalks: recentWalks || [],
    myWork: latestProjects || [],
    coordinationAlerts: alarms || [],
    processingJobs: processingJobs || [],
    usage: usage ? {
      storageGbUsed: usage.storageUsedGb?.toFixed(2) || "0.00",
      storageGbLimit: 10, // Assuming static limit for UI
    } : null
  };

  return <DashboardV3Shell data={data} />;
}
