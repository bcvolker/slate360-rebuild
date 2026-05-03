import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type OperationsConsoleCounts = {
  pendingAccess: number;
  newFeedback: number;
  featureRequests: number;
  openFeedback: number;
};

export async function getOperationsConsoleCounts(): Promise<OperationsConsoleCounts> {
  const admin = createAdminClient();
  const [pendingAccessRes, newFeedbackRes, featureRequestsRes, openFeedbackRes] = await Promise.all([
    // Use account_status for V1 canonical pending count
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("account_status", "pending_approval"),
    admin.from("beta_feedback").select("*", { count: "exact", head: true }).eq("status", "new"),
    admin.from("beta_feedback").select("*", { count: "exact", head: true }).in("type", ["feature", "ux"]),
    admin.from("beta_feedback").select("*", { count: "exact", head: true }).in("status", ["new", "triaged", "in_progress"]),
  ]);

  return {
    pendingAccess: pendingAccessRes.count ?? 0,
    newFeedback: newFeedbackRes.count ?? 0,
    featureRequests: featureRequestsRes.count ?? 0,
    openFeedback: openFeedbackRes.count ?? 0,
  };
}
