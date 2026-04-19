import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

export type InvitationType = "ceo" | "beta" | "collaborator";

type InvitationTokenRow = {
  id: string;
  token: string;
  invite_type: InvitationType;
  project_id: string | null;
  org_id: string | null;
  status: "active" | "redeemed" | "revoked" | "expired";
  expires_at: string | null;
  redeemed_count: number;
  max_redemptions: number;
  metadata: Record<string, unknown> | null;
};

type RedemptionResult = {
  inviteType: InvitationType;
  redirectPath: string | null;
};

async function ensureProjectMembership(
  admin: SupabaseClient,
  projectId: string,
  userId: string,
  preferredRole: "collaborator" | "viewer" = "collaborator",
): Promise<void> {
  const { data: existing } = await admin
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return;
  }

  const attempts: Array<Record<string, unknown>> = [
    { project_id: projectId, user_id: userId, role: preferredRole, status: "active" },
    { project_id: projectId, user_id: userId, role: preferredRole },
    { project_id: projectId, user_id: userId, role_id: preferredRole, status: "active" },
    { project_id: projectId, user_id: userId, role: "viewer", status: "active" },
    { project_id: projectId, user_id: userId, role: "viewer" },
    { project_id: projectId, user_id: userId },
  ];

  let lastError: string | null = null;
  for (const payload of attempts) {
    const { error } = await admin.from("project_members").insert(payload);
    if (!error) return;
    lastError = error.message;
  }

  throw new Error(lastError ?? "Failed to add project collaborator");
}

async function ensureBetaApproved(admin: SupabaseClient, user: User): Promise<void> {
  const email = user.email?.toLowerCase() ?? null;
  const displayName = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : null;

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ is_beta_approved: true })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (!updateError && updated?.id) {
    return;
  }

  const upsertAttempts: Array<Record<string, unknown>> = [
    { id: user.id, email, is_beta_approved: true },
    { id: user.id, email, display_name: displayName, is_beta_approved: true },
    { id: user.id, email, full_name: displayName, is_beta_approved: true },
  ];

  let lastError = updateError?.message ?? "Failed to beta-approve profile";

  for (const payload of upsertAttempts) {
    const { error } = await admin.from("profiles").upsert(payload, { onConflict: "id" });
    if (!error) return;
    lastError = error.message;
  }

  throw new Error(lastError);
}

export async function redeemInvitationToken(
  admin: SupabaseClient,
  user: User,
  token: string,
): Promise<RedemptionResult> {
  const { data: invite, error } = await admin
    .from("invitation_tokens")
    .select("id, token, invite_type, project_id, org_id, status, expires_at, redeemed_count, max_redemptions, metadata")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) {
    throw new Error("Invitation token not found");
  }

  const invitation = invite as InvitationTokenRow;
  const expired = invitation.expires_at ? new Date(invitation.expires_at).getTime() < Date.now() : false;

  if (expired) {
    await admin.from("invitation_tokens").update({ status: "expired" }).eq("id", invitation.id);
    throw new Error("Invitation token expired");
  }

  if (invitation.status !== "active") {
    throw new Error("Invitation token is no longer active");
  }

  if (invitation.redeemed_count >= invitation.max_redemptions) {
    await admin.from("invitation_tokens").update({ status: "redeemed" }).eq("id", invitation.id);
    throw new Error("Invitation token has already been redeemed");
  }

  let redirectPath: string | null = null;

  if (invitation.invite_type === "ceo" || invitation.invite_type === "beta") {
    await ensureBetaApproved(admin, user);
    redirectPath = "/dashboard";
  }

  if (invitation.invite_type === "collaborator") {
    if (!invitation.project_id) {
      throw new Error("Collaborator invite missing project scope");
    }
    await ensureProjectMembership(admin, invitation.project_id, user.id, "collaborator");
    // Mark the matching project_collaborator_invites row as accepted, if one exists.
    // Best-effort — the table may not be present in older deployments.
    try {
      await admin
        .from("project_collaborator_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("invitation_token", invitation.token)
        .eq("status", "pending");
    } catch {
      // Migration not applied yet — ignore.
    }
    // Route invitees with no org of their own into the trapped Collaborator
    // shell so they don't see modules they have no access to.
    const { data: orgRows } = await admin
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1);
    const hasOrg = (orgRows ?? []).length > 0;
    redirectPath = hasOrg
      ? `/projects/${invitation.project_id}`
      : `/collaborator`;
  }

  const nextCount = invitation.redeemed_count + 1;
  const nextStatus = nextCount >= invitation.max_redemptions ? "redeemed" : "active";

  const { error: redeemError } = await admin
    .from("invitation_tokens")
    .update({
      redeemed_count: nextCount,
      redeemed_by: user.id,
      redeemed_at: new Date().toISOString(),
      status: nextStatus,
    })
    .eq("id", invitation.id);

  if (redeemError) {
    throw new Error(redeemError.message);
  }

  return {
    inviteType: invitation.invite_type,
    redirectPath,
  };
}