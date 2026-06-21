/**
 * One-time seed: upsert Starter Library rows into content_library_assets.
 *
 * Usage:
 *   npx tsx scripts/seed-content-studio-library.ts --org-id <uuid>
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in env.
 */
import { createClient } from "@supabase/supabase-js";
import { ALL_STARTER_ITEMS, STARTER_LIBRARY_VERSION } from "../lib/content-studio/starter-library";

function parseOrgId(): string {
  const idx = process.argv.indexOf("--org-id");
  const id = idx >= 0 ? process.argv[idx + 1] : process.env.CONTENT_STUDIO_SEED_ORG_ID;
  if (!id) {
    console.error("Missing --org-id or CONTENT_STUDIO_SEED_ORG_ID");
    process.exit(1);
  }
  return id;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const orgId = parseOrgId();
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const rows = ALL_STARTER_ITEMS.map((item) => ({
    org_id: orgId,
    asset_type: item.assetType,
    name: item.name,
    storage_key: item.storageKey ?? null,
    metadata: {
      ...item.metadata,
      starterId: item.id,
      category: item.category,
      license: item.license,
      sourceUrl: item.sourceUrl,
      attribution: item.attribution,
      dropTarget: item.dropTarget,
      gapsClosed: item.gapsClosed,
      manifestVersion: STARTER_LIBRARY_VERSION,
    },
    look_json: item.lookJson ?? null,
  }));

  const { error } = await admin.from("content_library_assets").upsert(rows, {
    onConflict: "org_id,asset_type,name",
    ignoreDuplicates: false,
  });

  if (error) {
    // Fallback: table may lack unique constraint — insert in batches
    console.warn("Bulk upsert failed, inserting individually:", error.message);
    let ok = 0;
    for (const row of rows) {
      const { error: e2 } = await admin.from("content_library_assets").insert(row);
      if (!e2) ok += 1;
    }
    console.log(`Inserted ${ok}/${rows.length} starter library rows for org ${orgId}`);
    return;
  }

  console.log(`Seeded ${rows.length} starter library rows for org ${orgId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
