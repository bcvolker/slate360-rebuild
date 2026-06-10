import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeTwinProcessingCredits, type TwinCreditAsset } from "@/lib/twin/processing-credits";
import { computeTwinSourcesProcessingEstimate } from "@/lib/twin/job-processing-estimate";
import type {
  TwinJobCreditEstimate,
  TwinProcessingQuality,
} from "@/lib/twin/processing-estimate-types";

type AdminClient = SupabaseClient;

export type { TwinJobCreditEstimate, TwinProcessingQuality };

export type TwinSourcesEstimateInput = {
  sources: TwinCreditAsset[];
  outputFormat?: "spz" | "ply" | "glb";
  quality?: TwinProcessingQuality;
  frameCount?: number;
};

export async function resolveTwinJobCreditEstimate(
  admin: AdminClient,
  orgId: string,
  captureId: string,
  outputFormat: "spz" | "ply" | "glb" = "spz",
): Promise<TwinJobCreditEstimate> {
  const { data: assets, error: assetsError } = await admin
    .from("digital_twin_capture_assets")
    .select("asset_kind, file_size_bytes")
    .eq("capture_id", captureId)
    .eq("org_id", orgId)
    .eq("status", "ready")
    .is("deleted_at", null);

  if (assetsError) throw new Error(assetsError.message);

  const creditsRequired = computeTwinProcessingCredits(assets ?? [], outputFormat);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("credits_balance")
    .eq("id", orgId)
    .single();

  if (orgError) throw new Error(orgError.message);

  const creditsBalance = Number(org?.credits_balance ?? 0);

  return {
    creditsRequired,
    creditsBalance,
    sufficient: creditsBalance >= creditsRequired,
    assetCount: assets?.length ?? 0,
  };
}

export async function resolveTwinSourcesJobEstimate(
  admin: AdminClient,
  orgId: string,
  input: TwinSourcesEstimateInput,
): Promise<TwinJobCreditEstimate> {
  const outputFormat = input.outputFormat ?? "spz";
  const quality = input.quality ?? "standard";
  const sources = input.sources ?? [];

  const processing = computeTwinSourcesProcessingEstimate(
    sources,
    outputFormat,
    quality,
    input.frameCount,
  );

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("credits_balance")
    .eq("id", orgId)
    .single();

  if (orgError) throw new Error(orgError.message);

  const creditsBalance = Number(org?.credits_balance ?? 0);
  const creditsRequired = processing.creditsRequired;

  return {
    creditsRequired,
    creditsBalance,
    sufficient: creditsBalance >= creditsRequired,
    assetCount: processing.assetCount,
    estimatedMinutes: processing.estimatedMinutes,
    frameCount: processing.frameCount,
  };
}

export class InsufficientTwinCreditsError extends Error {
  constructor(
    readonly creditsRequired: number,
    readonly creditsBalance: number,
  ) {
    super(
      `Insufficient credits: processing requires ${creditsRequired}, balance is ${creditsBalance}`,
    );
    this.name = "InsufficientTwinCreditsError";
  }
}

export async function assertTwinJobCredits(
  admin: AdminClient,
  orgId: string,
  captureId: string,
  outputFormat: "spz" | "ply" | "glb" = "spz",
): Promise<TwinJobCreditEstimate> {
  const estimate = await resolveTwinJobCreditEstimate(admin, orgId, captureId, outputFormat);
  if (!estimate.sufficient) {
    throw new InsufficientTwinCreditsError(estimate.creditsRequired, estimate.creditsBalance);
  }
  return estimate;
}
