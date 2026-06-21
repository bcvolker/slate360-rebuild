import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, forbidden } from "@/lib/server/api-response";
import { buildStarterCatalog } from "@/lib/content-studio/starter-library";

export const dynamic = "force-dynamic";

/** GET /api/content-studio/library — static starter catalog + optional org DB rows. */
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    const catalog = buildStarterCatalog();
    const category = req.nextUrl.searchParams.get("category");

    const { data: dbRows } = await admin
      .from("content_library_assets")
      .select("id, asset_type, name, storage_key, thumbnail_key, metadata, look_json, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500);

    const items = category
      ? catalog.items.filter((i) => i.category === category)
      : catalog.items;

    return ok({
      version: catalog.version,
      categories: catalog.categories,
      items,
      orgAssets: dbRows ?? [],
    });
  });
