/**
 * GET /api/ceo/revenue — live MRR/ARR snapshot computed from Stripe.
 *
 * CEO/owner only. Lazy-loaded by the Operations Console Revenue tab so it
 * doesn't slow first paint. Returns a not-configured snapshot when Stripe
 * isn't wired yet.
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, forbidden } from "@/lib/server/api-response";
import { isOwnerEmail } from "@/lib/server/beta-access";
import { computeStripeRevenue } from "@/lib/server/stripe-revenue";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ user }) => {
    if (!isOwnerEmail(user.email)) return forbidden("CEO access required");
    const revenue = await computeStripeRevenue();
    return ok({ revenue });
  });
