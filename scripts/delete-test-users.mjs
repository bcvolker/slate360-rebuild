/**
 * One-time script: delete today's test accounts from Supabase.
 * Run: node --env-file=.env.local scripts/delete-test-users.mjs
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const KEEP_EMAILS = ["volkerfam@yahoo.com"];
const SINCE = new Date("2026-03-24T00:00:00Z");

const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
if (error) { console.error("List error:", error.message); process.exit(1); }

const toDelete = data.users.filter(u => {
  const created = new Date(u.created_at);
  return created >= SINCE && !KEEP_EMAILS.includes(u.email ?? "");
});

console.log(`Found ${toDelete.length} account(s) to delete:`);
toDelete.forEach(u =>
  console.log(` - ${u.email} | confirmed: ${u.email_confirmed_at ? "YES" : "NO"} | created: ${u.created_at}`)
);

for (const u of toDelete) {
  const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
  if (delErr) console.error(`  ✗ Delete failed for ${u.email}:`, delErr.message);
  else console.log(`  ✓ Deleted: ${u.email}`);
}

console.log("Done.");
