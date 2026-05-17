import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { buildInviteShareData } from "@/lib/server/invite-share-data";
import { DashboardV2FullShell } from "@/components/dashboard-v2-full/DashboardV2FullShell";
import { DashboardV2Shell } from "@/components/dashboard-v2/DashboardV2Shell";

export const metadata = {
  title: "Slate360 — Dashboard V2 Full Shell Preview",
};

/**
 * Dashboard V2 Full-Shell Preview — lives at /preview/dashboard-v2-full.
 *
 * This route is intentionally placed OUTSIDE the (dashboard) route group so it
 * receives only app/layout.tsx — not AppShell. It provides its own full-viewport
 * shell via DashboardV2FullShell.
 *
 * Swap plan: when this shell is approved for production, move this page's content
 * to app/(dashboard)/dashboard/page.tsx and remove the AppShell wrapping from
 * app/(dashboard)/layout.tsx (or migrate to a parallel route group).
 */
export default async function DashboardV2FullPreviewPage() {
  const {
    user,
    orgId,
    orgName,
    isSlateCeo,
    hasOperationsConsoleAccess,
    isBetaApproved,
  } = await resolveServerOrgContext();

  if (!user) redirect("/login");

  const [entitlements, inviteShareData] = await Promise.all([
    resolveOrgEntitlements(orgId ?? null),
    buildInviteShareData(user, orgId ?? null),
  ]);

  const rawName: string =
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "";
  const userInitial = rawName.charAt(0).toUpperCase() || "?";

  return (
    <DashboardV2FullShell
      userName={rawName}
      userInitial={userInitial}
      workspaceName={orgName ?? "My Workspace"}
      hasOperationsConsoleAccess={hasOperationsConsoleAccess}
      isBetaEligible={isBetaApproved}
      inviteShareData={inviteShareData}
    >
      {/* Slice 1 content — same App Launcher + Quick Actions as /preview/dashboard-v2 */}
      <DashboardV2Shell entitlements={entitlements} isSlateCeo={isSlateCeo} />
    </DashboardV2FullShell>
  );
}
