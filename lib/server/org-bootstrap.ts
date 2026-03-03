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

  const attempts: Array<Record<string, unknown>> = [
    { name: orgName, tier: "trial", owner_user_id: user.id },
    { name: orgName, tier: "trial" },
    { name: orgName, plan: "trial", owner_user_id: user.id },
    { name: orgName, plan: "trial" },
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

  return insertedOrg.id;
}
