/**
 * One-time script: wipe ALL accounts from Supabase except slate360Ceo@gmail.com.
 *
 * USE ONLY DURING BETA / PRE-LAUNCH.
 *
 * Run: node --env-file=.env scripts/wipe-all-users-except-ceo.mjs
 *
 * Safety:
 *  - Requires SUPABASE_SERVICE_ROLE_KEY
 *  - Refuses to run if more than 250 users would be deleted
 *  - Prints the kill list, requires --confirm to actually delete
 *  - Auth user delete cascades to public.profiles via FK ON DELETE CASCADE
 */
import { createClient } from "@supabase/supabase-js";

const KEEP_EMAILS = ["slate360ceo@gmail.com"]; // lower-cased for comparison
const HARD_LIMIT = 250;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const confirm = process.argv.includes("--confirm");

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Page through all users (Supabase admin paginates at 1000/page).
const allUsers = [];
let page = 1;
const perPage = 200;
while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) {
    console.error("List error:", error.message);
    process.exit(1);
  }
  allUsers.push(...data.users);
  if (data.users.length < perPage) break;
  page += 1;
  if (page > 50) break; // safety: never page past 10k users
}

const toDelete = allUsers.filter(
  (u) => !KEEP_EMAILS.includes((u.email ?? "").toLowerCase()),
);
const toKeep = allUsers.filter((u) =>
  KEEP_EMAILS.includes((u.email ?? "").toLowerCase()),
);

console.log(`Total users: ${allUsers.length}`);
console.log(`Keeping (${toKeep.length}):`);
toKeep.forEach((u) => console.log(`  ✓ ${u.email}`));
console.log(`Deleting (${toDelete.length}):`);
toDelete.forEach((u) =>
  console.log(`  ✗ ${u.email} | created: ${u.created_at}`),
);

if (toDelete.length > HARD_LIMIT) {
  console.error(`\n❌ Refusing to delete ${toDelete.length} users — exceeds HARD_LIMIT of ${HARD_LIMIT}.`);
  console.error("   Edit HARD_LIMIT in this script if this is intentional.");
  process.exit(1);
}

if (!confirm) {
  console.log("\nDry run. Re-run with --confirm to actually delete.");
  process.exit(0);
}

console.log("\nDeleting...");
let ok = 0;
let fail = 0;
for (const u of toDelete) {
  const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
  if (delErr) {
    console.error(`  ✗ ${u.email}: ${delErr.message}`);
    fail += 1;
  } else {
    console.log(`  ✓ ${u.email}`);
    ok += 1;
  }
}

console.log(`\nDone. Deleted ${ok}, failed ${fail}.`);
process.exit(fail > 0 ? 1 : 0);
