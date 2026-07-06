import { NextResponse } from "next/server";
import { getAuthenticatedOrgContext } from "@/lib/billing-server";

export const runtime = "nodejs";

/**
 * C7: minimal context the native purchase pane needs before it can call
 * Purchases.configure() — RevenueCat's appUserID must be set client-side, and
 * org_id (resolved server-side from the session) is what the store-webhook
 * maps a purchase back to.
 */
export async function GET() {
  const orgContext = await getAuthenticatedOrgContext();
  if (orgContext.status !== 200) {
    return NextResponse.json({ error: orgContext.error }, { status: orgContext.status });
  }
  return NextResponse.json({ orgId: orgContext.orgId });
}
