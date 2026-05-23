import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { resolveUsageTruth } from "@/lib/server/usage-truth";
import { createClient } from "@/lib/supabase/server";
import { DashboardV3Shell } from "@/components/dashboard-v3/DashboardV3Shell";

export const metadata = {
  title: "Slate360 — Home",
};

export default async function MobileAppRootPage() {
  const { user, orgId, isSlateCeo, role } = await resolveServerOrgContext();

  if (!user) {
    redirect("/login");
  }

  if (!orgId) {
    try {
      await ensureUserOrganization(user);
    } catch (error) {
      console.error("[app] org bootstrap fallback failed", error);
    }
  }

  const activeOrgId = orgId ?? (await resolveServerOrgContext()).orgId;

  if (!activeOrgId) {
    return (
      <DashboardV3Shell
        data={{
          roleName: "Member",
          alerts: [],
          latestProject: null,
          recentProjects: [],
          recentWalks: [],
          myWork: [],
          coordinationAlerts: [],
          processingJobs: [],
          usage: null,
        }}
      />
    );
  }

  const supabase = await createClient();

  let usage = null;
  try {
    usage = await resolveUsageTruth({ userId: user.id, orgId: activeOrgId });
  } catch (error) {
    console.warn("[app] usage query failed", error instanceof Error ? error.message : error);
  }

  let latestProjects: { id: string; name: string; created_at: string }[] = [];
  try {
    const res = await supabase
      .from("projects")
      .select("id, name, created_at")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false })
      .limit(4);
    latestProjects = res.data ?? [];
    if (res.error) console.warn("[app] projects query error:", res.error.message);
  } catch (error) {
    console.warn("[app] projects query failed", error instanceof Error ? error.message : error);
  }

  const latestProject = latestProjects[0] ?? null;

  let alarms: { id: string; message: string; severity: string; created_at: string }[] = [];
  try {
    const res = await supabase
      .from("project_notifications")
      .select("id, message, severity, created_at")
      .eq("org_id", activeOrgId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    alarms = res.data ?? [];
    if (res.error) console.warn("[app] project_notifications query error:", res.error.message);
  } catch (error) {
    console.warn("[app] project_notifications query failed", error instanceof Error ? error.message : error);
  }

  let processingJobs: {
    id: string;
    filename: string;
    status: string;
    processing_progress: number;
    created_at: string;
  }[] = [];
  try {
    const res = await supabase
      .from("slatedrop_uploads")
      .select("id, filename, status, processing_progress, created_at")
      .eq("org_id", activeOrgId)
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);
    processingJobs = res.data ?? [];
    if (res.error) console.warn("[app] slatedrop_uploads query error:", res.error.message);
  } catch (error) {
    console.warn("[app] slatedrop_uploads query failed", error instanceof Error ? error.message : error);
  }

  let recentWalks: { id: string; name: string; created_at: string }[] = [];
  try {
    const res = await supabase
      .from("site_walk_sessions")
      .select("id, name, created_at")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: false })
      .limit(3);
    recentWalks = res.data ?? [];
    if (res.error) console.warn("[app] site_walk_sessions query error:", res.error.message);
  } catch (error) {
    console.warn("[app] site_walk_sessions query failed", error instanceof Error ? error.message : error);
  }

  const data = {
    roleName: role === "ceo" || role === "admin" || isSlateCeo ? "Admin" : "Member",
    alerts: alarms,
    latestProject,
    recentProjects: latestProjects,
    recentWalks,
    myWork: latestProjects,
    coordinationAlerts: alarms,
    processingJobs,
    usage: usage
      ? {
          storageGbUsed: usage.storageUsedGb?.toFixed(2) || "0.00",
          storageGbLimit: 10,
        }
      : null,
  };

  return <DashboardV3Shell data={data} />;
}
