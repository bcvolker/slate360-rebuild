import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export async function getScopedTwinModel<T extends string>(
  admin: Admin,
  modelId: string,
  orgId: string | null,
  select: T,
) {
  if (!orgId) return null;
  const { data, error } = await admin
    .from("digital_twin_models")
    .select(select)
    .eq("id", modelId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
