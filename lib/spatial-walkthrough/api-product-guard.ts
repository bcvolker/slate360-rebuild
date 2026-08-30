import { NextRequest, NextResponse } from "next/server";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadClientSurfaceFlags } from "@/lib/spatial-walkthrough/purchased-flags";
import { productApiFromPath, type GuardedProductApi } from "./api-product-paths";

export type { GuardedProductApi };
export { productApiFromPath };

export async function rejectUnpurchasedProductApi(
  req: NextRequest,
  orgId: string | null,
): Promise<NextResponse | null> {
  const product = productApiFromPath(req.nextUrl.pathname);
  if (!product) return null;

  const org = await resolveServerOrgContext();
  const flags = await loadClientSurfaceFlags(orgId ?? org.orgId, Boolean(org.isSlateCeo));

  const allowed =
    (product === "site-walk" && flags.siteWalk) ||
    (product === "twin360" && flags.twin360) ||
    (product === "thermal" && flags.thermal) ||
    (product === "content-studio" && flags.contentStudio) ||
    (product === "design-studio" && flags.designStudio);

  if (allowed) return null;

  return NextResponse.json(
    { error: "This product is not enabled for this organization" },
    { status: 403 },
  );
}
