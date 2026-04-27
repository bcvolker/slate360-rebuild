import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveModularEntitlements,
  type OrgAppSubscriptions,
} from "@/lib/entitlements";

const BYTES_PER_GB = 1024 * 1024 * 1024;
const BASIC_STORAGE_BYTES = 5 * BYTES_PER_GB;
const PRO_STORAGE_BYTES = 25 * BYTES_PER_GB;
const BASIC_AI_CREDITS = 300;
const PRO_AI_CREDITS = 1_000;

export type SiteWalkMeteringReason = "storage_full" | "credits_empty";
export type SiteWalkMeteringUnit = "bytes" | "credits" | "count" | "messages" | "minutes" | "pages";
export type SiteWalkMeteringTier = "basic" | "pro";

export type SiteWalkMeteringResult =
  | {
      allowed: true;
      currentUsage: number;
      limit: number;
      tier: SiteWalkMeteringTier;
      unit: SiteWalkMeteringUnit;
      meteringFailed?: boolean;
    }
  | {
      allowed: false;
      reason: SiteWalkMeteringReason;
      currentUsage: number;
      limit: number;
      tier: SiteWalkMeteringTier;
      unit: SiteWalkMeteringUnit;
    };

export type SiteWalkUsageEventType =
  | "storage_bytes_uploaded"
  | "storage_bytes_deleted"
  | "ai_credits_used"
  | "pdf_export"
  | "spreadsheet_export"
  | "portal_view"
  | "presentation_view"
  | "sms_sent"
  | "email_sent"
  | "realtime_minutes"
  | "media_transcode"
  | "plan_page_processed";

type OrgAppSubscriptionRow = {
  site_walk?: OrgAppSubscriptions["site_walk"] | null;
  tours?: OrgAppSubscriptions["tours"] | null;
  slatedrop?: OrgAppSubscriptions["slatedrop"] | null;
  design_studio?: OrgAppSubscriptions["design_studio"] | null;
  content_studio?: OrgAppSubscriptions["content_studio"] | null;
  bundle?: OrgAppSubscriptions["bundle"] | null;
  storage_addon_gb?: number | null;
  credit_addon_balance?: number | null;
};

type MonthlyUsageRow = {
  event_type: SiteWalkUsageEventType | string;
  total_quantity: number | string | null;
};

export type RecordSiteWalkUsageParams = {
  orgId: string;
  projectId?: string | null;
  sessionId?: string | null;
  eventType: SiteWalkUsageEventType;
  quantity: number;
  unit: SiteWalkMeteringUnit;
  sourceTable?: string | null;
  sourceId?: string | null;
  metadata?: Record<string, unknown>;
};

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveSiteWalkTier(row: OrgAppSubscriptionRow | null): SiteWalkMeteringTier {
  const modular = resolveModularEntitlements(
    row
      ? {
          site_walk: row.site_walk ?? "none",
          tours: row.tours ?? "none",
          slatedrop: row.slatedrop ?? "none",
          design_studio: row.design_studio ?? "none",
          content_studio: row.content_studio ?? "none",
          bundle: row.bundle ?? null,
          storageAddonGB: row.storage_addon_gb ?? 0,
          creditAddonBalance: row.credit_addon_balance ?? 0,
        }
      : null,
  );

  return modular.apps.site_walk.tier === "pro" ? "pro" : "basic";
}

async function loadSiteWalkTier(
  admin: SupabaseClient,
  orgId: string,
): Promise<SiteWalkMeteringTier> {
  const { data, error } = await admin
    .from("org_app_subscriptions")
    .select("site_walk, tours, slatedrop, design_studio, content_studio, bundle, storage_addon_gb, credit_addon_balance")
    .eq("org_id", orgId)
    .maybeSingle<OrgAppSubscriptionRow>();

  if (error) throw error;
  return resolveSiteWalkTier(data ?? null);
}

async function readMonthlyUsage(
  admin: SupabaseClient,
  orgId: string,
  eventTypes: SiteWalkUsageEventType[],
): Promise<number> {
  const { data, error } = await admin
    .from("site_walk_usage_monthly")
    .select("event_type, total_quantity")
    .eq("org_id", orgId)
    .eq("month", monthStart())
    .in("event_type", eventTypes);

  if (error) throw error;

  return ((data ?? []) as MonthlyUsageRow[]).reduce((sum, row) => {
    const quantity = toNumber(row.total_quantity);
    return row.event_type === "storage_bytes_deleted" ? sum - quantity : sum + quantity;
  }, 0);
}

function failOpen(
  error: unknown,
  limit: number,
  unit: SiteWalkMeteringUnit,
): SiteWalkMeteringResult {
  console.error("[site-walk-metering] fail-open after metering error", error);
  return { allowed: true, currentUsage: 0, limit, tier: "basic", unit, meteringFailed: true };
}

export async function checkStorageLimit(
  admin: SupabaseClient,
  orgId: string,
  bytesToAdd: number,
): Promise<SiteWalkMeteringResult> {
  try {
    const tier = await loadSiteWalkTier(admin, orgId);
    const limit = tier === "pro" ? PRO_STORAGE_BYTES : BASIC_STORAGE_BYTES;
    const currentUsage = Math.max(
      0,
      await readMonthlyUsage(admin, orgId, ["storage_bytes_uploaded", "storage_bytes_deleted"]),
    );

    if (currentUsage + Math.max(0, bytesToAdd) > limit) {
      return { allowed: false, reason: "storage_full", currentUsage, limit, tier, unit: "bytes" };
    }
    return { allowed: true, currentUsage, limit, tier, unit: "bytes" };
  } catch (error) {
    return failOpen(error, BASIC_STORAGE_BYTES, "bytes");
  }
}

export async function checkAICreditLimit(
  admin: SupabaseClient,
  orgId: string,
  creditsToAdd: number,
): Promise<SiteWalkMeteringResult> {
  try {
    const tier = await loadSiteWalkTier(admin, orgId);
    const limit = tier === "pro" ? PRO_AI_CREDITS : BASIC_AI_CREDITS;
    const currentUsage = await readMonthlyUsage(admin, orgId, ["ai_credits_used"]);

    if (currentUsage + Math.max(0, creditsToAdd) > limit) {
      return { allowed: false, reason: "credits_empty", currentUsage, limit, tier, unit: "credits" };
    }
    return { allowed: true, currentUsage, limit, tier, unit: "credits" };
  } catch (error) {
    return failOpen(error, BASIC_AI_CREDITS, "credits");
  }
}

export async function recordSiteWalkUsage(
  admin: SupabaseClient,
  params: RecordSiteWalkUsageParams,
): Promise<void> {
  if (!Number.isFinite(params.quantity) || params.quantity <= 0) return;

  const payload = {
    p_org_id: params.orgId,
    p_project_id: params.projectId ?? null,
    p_session_id: params.sessionId ?? null,
    p_event_type: params.eventType,
    p_quantity: params.quantity,
    p_unit: params.unit,
    p_source_table: params.sourceTable ?? null,
    p_source_id: params.sourceId ?? null,
    p_metadata: params.metadata ?? {},
  };

  const { error } = await admin.rpc("record_site_walk_usage", payload);
  if (!error) return;

  console.error("[site-walk-metering] record_site_walk_usage failed; inserting fallback event", error);
  const { error: insertError } = await admin.from("site_walk_usage_events").insert({
    org_id: params.orgId,
    project_id: params.projectId ?? null,
    session_id: params.sessionId ?? null,
    event_type: params.eventType,
    quantity: params.quantity,
    unit: params.unit,
    source_table: params.sourceTable ?? null,
    source_id: params.sourceId ?? null,
    metadata: params.metadata ?? {},
  });

  if (insertError) {
    console.error("[site-walk-metering] fallback usage insert failed", insertError);
  }
}

export function meteringBlockedResponse(result: SiteWalkMeteringResult): NextResponse | null {
  if (result.allowed) return null;
  return NextResponse.json(
    {
      error: result.reason === "storage_full" ? "Storage limit reached" : "AI credits exhausted",
      metering: result,
    },
    { status: 402 },
  );
}
