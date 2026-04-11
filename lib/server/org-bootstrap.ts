import "server-only";

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type OrgInsertResult = {
  id: string;
};

function deriveOrgName(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const preferred = typeof metadata?.org_name === "string" ? metadata.org_name.trim() : "";
  if (preferred) {
    return preferred;
  }

  const fullName = typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "";
  if (fullName) {
    return `${fullName}'s Organization`;
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();
  return emailPrefix ? `${emailPrefix}'s Organization` : "Slate360 Organization";
}

async function insertOrganization(user: User, orgName: string): Promise<OrgInsertResult> {
  const admin = createAdminClient();

  const TRIAL_STORAGE_BYTES = 2 * 1073741824; // 2 GB — must match lib/entitlements.ts and webhook

  const attempts: Array<Record<string, unknown>> = [
    { name: orgName, tier: "trial", owner_user_id: user.id, storage_limit_bytes: TRIAL_STORAGE_BYTES },
    { name: orgName, tier: "trial", storage_limit_bytes: TRIAL_STORAGE_BYTES },
    { name: orgName, plan: "trial", owner_user_id: user.id, storage_limit_bytes: TRIAL_STORAGE_BYTES },
    { name: orgName, plan: "trial", storage_limit_bytes: TRIAL_STORAGE_BYTES },
    { name: orgName },
  ];

  let lastErrorMessage = "Unknown organization insert error";

  for (const payload of attempts) {
    const { data, error } = await admin
      .from("organizations")
      .insert(payload)
      .select("id")
      .single();

    if (!error && data?.id) {
      return { id: data.id };
    }

    if (error?.message) {
      lastErrorMessage = error.message;
    }
  }

  throw new Error(lastErrorMessage);
}

export async function ensureUserOrganization(user: User): Promise<string> {
  const admin = createAdminClient();

  const { data: existingMembership } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership?.org_id) {
    return existingMembership.org_id;
  }

  const orgName = deriveOrgName(user);
  const insertedOrg = await insertOrganization(user, orgName);

  const membershipPayloads: Array<Record<string, unknown>> = [
    { org_id: insertedOrg.id, user_id: user.id, role: "owner" },
    { org_id: insertedOrg.id, user_id: user.id, role_id: "owner", status: "active" },
    { org_id: insertedOrg.id, user_id: user.id },
  ];

  let membershipCreated = false;
  let membershipErrorMessage = "Unknown membership insert error";

  for (const payload of membershipPayloads) {
    const { error } = await admin.from("organization_members").insert(payload);
    if (!error) {
      membershipCreated = true;
      break;
    }
    if (error.message) {
      membershipErrorMessage = error.message;
    }
  }

  if (!membershipCreated) {
    throw new Error(membershipErrorMessage);
  }

  // Provision org_feature_flags (standalone apps default to false, trial limits)
  await provisionOrgFeatureFlags(admin, insertedOrg.id);

  // Provision a root SlateDrop org folder so the file browser works on first load
  await provisionRootSlateDropFolder(admin, insertedOrg.id, user.id);

  return insertedOrg.id;
}

/**
 * Insert a default org_feature_flags row for a new org.
 * All standalone apps default to false; the org inherits trial limits from its tier.
 */
async function provisionOrgFeatureFlags(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
): Promise<void> {
  const { error } = await admin.from("org_feature_flags").upsert(
    {
      org_id: orgId,
      standalone_tour_builder: false,
      standalone_punchwalk: false,
      tour_builder_seat_limit: 0,
      tour_builder_seats_used: 0,
    },
    { onConflict: "org_id" },
  );
  if (error) {
    console.error("[org-bootstrap] org_feature_flags provision failed:", error.message);
  }
}

/**
 * Insert a root "SlateDrop" folder in project_folders for the org.
 * This ensures the SlateDrop file browser has an org-level root on first load.
 */
async function provisionRootSlateDropFolder(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  userId: string,
): Promise<void> {
  // Check if an org-level root already exists
  const { data: existing } = await admin
    .from("project_folders")
    .select("id")
    .eq("org_id", orgId)
    .eq("scope", "org")
    .eq("is_system", true)
    .eq("folder_type", "root")
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await admin.from("project_folders").insert({
    org_id: orgId,
    name: "SlateDrop",
    folder_path: `orgs/${orgId}/SlateDrop`,
    scope: "org",
    is_system: true,
    folder_type: "root",
    icon: "📂",
    sort_order: 0,
    created_by: userId,
  });
  if (error) {
    console.error("[org-bootstrap] SlateDrop root folder provision failed:", error.message);
  }
}
