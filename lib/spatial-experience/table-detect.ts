import type { SupabaseClient } from "@supabase/supabase-js";

const CACHE = new Map<string, boolean>();

export async function tableAvailable(admin: SupabaseClient, table: string): Promise<boolean> {
  if (CACHE.has(table)) return CACHE.get(table) as boolean;
  const { error } = await admin.from(table).select("id").limit(1);
  const ok = !error || !/schema cache|does not exist|Could not find/i.test(error.message);
  CACHE.set(table, ok && !error ? true : !error);
  if (error && /schema cache|does not exist|Could not find/i.test(error.message)) {
    CACHE.set(table, false);
    return false;
  }
  CACHE.set(table, !error || error.code !== "PGRST205");
  return CACHE.get(table) as boolean;
}

export function resetTableDetect(): void {
  CACHE.clear();
}
