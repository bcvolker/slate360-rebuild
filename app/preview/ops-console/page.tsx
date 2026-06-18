// Preview harness for the Operations Console — renders the real client shell
// with mock data so the authed admin UI can be visually verified without login.
// Not linked anywhere; dev/preview only.
import { OperationsConsoleClient } from "@/components/ops/console/OperationsConsoleClient";
import type { OpsConsoleInitialData } from "@/lib/ops-console/types";

const MOCK: OpsConsoleInitialData = {
  isCeo: true,
  counts: { pendingAccess: 3, newFeedback: 5, featureRequests: 2, openFeedback: 7 },
  overview: {
    totalOrgs: 42,
    totalUsers: 128,
    tierBreakdown: { trial: 30, standard: 8, business: 3, enterprise: 1 },
  },
  feedback: [
    { id: "f1", type: "bug", status: "new", title: "Plan pin drifts on zoom", description: "When zooming the plan, saved pins shift a few pixels.", severity: "high", createdAt: new Date().toISOString() },
    { id: "f2", type: "feature", status: "triaged", title: "Bulk export deliverables", description: "Would love to export all walk reports at once.", severity: null, createdAt: new Date().toISOString() },
    { id: "f3", type: "other", status: "in_progress", title: "Dark mode on share page", description: "", severity: null, createdAt: new Date().toISOString() },
  ],
  pendingUsers: [
    { id: "u1", email: "pm@cpmg.com", createdAt: new Date().toISOString() },
    { id: "u2", email: "architect@asu.edu", createdAt: new Date().toISOString() },
  ],
  staff: [
    { id: "s1", email: "ops@slate360.ai", displayName: "Ops Lead", accessScope: ["market"], grantedAt: new Date().toISOString(), revokedAt: null },
  ],
  health: { stripe: true, stripeWebhook: false, supabase: true, supabaseService: true, appUrl: true },
};

export default function OpsConsolePreviewPage() {
  return (
    <div className="min-h-screen bg-[var(--graphite-canvas)]">
      <OperationsConsoleClient initial={MOCK} />
    </div>
  );
}
