import type { SupabaseClient, User } from "@supabase/supabase-js";
import { toNumberOrNull } from "@/lib/market/contracts";

export type UserPositionLimitSource = "market_plans" | "user_metadata" | "defaults";

function isMissingPlansSchema(code: string | undefined, message: string | undefined) {
  return code === "42P01" || code === "PGRST205" || message?.includes("market_plans") === true;
}

export async function resolveUserMaxOpenPositions({
  supabase,
  user,
  fallback,
}: {
  supabase: SupabaseClient;
  user: User;
  fallback: number;
}): Promise<{ maxOpenPositions: number; source: UserPositionLimitSource }> {
  const metadataConfig = user.user_metadata?.marketBotConfig;
  const metadataMax = metadataConfig && typeof metadataConfig === "object"
    ? toNumberOrNull((metadataConfig as Record<string, unknown>).maxOpenPositions)
    : null;

  const { data: plan, error } = await supabase
    .from("market_plans")
    .select("max_open_positions,is_default,updated_at")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && !isMissingPlansSchema(error.code, error.message)) {
    throw new Error(`market_plans_read_failed:${error.message}`);
  }

  const planMax = toNumberOrNull((plan as { max_open_positions?: unknown } | null)?.max_open_positions);
  if (planMax != null) {
    return { maxOpenPositions: Math.max(1, Math.round(planMax)), source: "market_plans" };
  }
  if (metadataMax != null) {
    return { maxOpenPositions: Math.max(1, Math.round(metadataMax)), source: "user_metadata" };
  }

  return { maxOpenPositions: Math.max(1, Math.round(fallback)), source: "defaults" };
}