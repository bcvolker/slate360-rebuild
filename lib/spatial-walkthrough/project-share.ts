import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifySharePassword, hashSharePassword } from "@/lib/slatedrop/share-password";
import { hashShareToken, mintShareToken, shareDenied, publicShareDenial } from "./share-token";

export type ProjectShareRow = {
  id: string;
  org_id: string;
  project_id: string;
  token_hash: string;
  token_prefix: string;
  label: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  password_hash: string | null;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  allow_download: boolean;
  allow_embed: boolean;
  is_revoked: boolean;
  last_viewed_at: string | null;
  created_at: string;
  created_by: string | null;
};

export type ProjectShareGrants = {
  can_comment: boolean;
  can_create_items: boolean;
  can_see_documents: boolean;
  can_see_internal_items: boolean;
  can_measure: boolean;
  visible_item_visibilities: string[];
};

const DEFAULT_GRANTS: ProjectShareGrants = {
  can_comment: true,
  can_create_items: true,
  can_see_documents: true,
  can_see_internal_items: false,
  can_measure: false,
  visible_item_visibilities: ["client"],
};

export { shareDenied, publicShareDenial };

/** Server-side only. Never returned to a client — the raw token exists once, at creation. */
export async function createProjectShare(args: {
  orgId: string;
  projectId: string;
  createdBy: string | null;
  label?: string | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  password?: string | null;
  expiresAt?: string | null;
  maxViews?: number | null;
  allowDownload?: boolean;
  allowEmbed?: boolean;
  grants?: Partial<ProjectShareGrants>;
}): Promise<{ token: string; share: ProjectShareRow }> {
  const admin = createAdminClient();
  const { token, hash, prefix } = mintShareToken();
  const { data, error } = await admin
    .from("spatial_project_shares")
    .insert({
      org_id: args.orgId,
      project_id: args.projectId,
      token_hash: hash,
      token_prefix: prefix,
      created_by: args.createdBy,
      label: args.label ?? null,
      recipient_name: args.recipientName ?? null,
      recipient_email: args.recipientEmail ?? null,
      password_hash: args.password ? hashSharePassword(args.password) : null,
      expires_at: args.expiresAt ?? null,
      max_views: args.maxViews ?? null,
      allow_download: args.allowDownload ?? false,
      allow_embed: args.allowEmbed ?? false,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "failed to create project share");

  const grants = { ...DEFAULT_GRANTS, ...(args.grants ?? {}) };
  await admin.from("spatial_project_share_grants").insert({ share_id: data.id, ...grants });

  return { token, share: data as ProjectShareRow };
}

export async function loadProjectShareRow(
  token: string,
): Promise<{ admin: ReturnType<typeof createAdminClient>; row: ProjectShareRow | null; grants: ProjectShareGrants }> {
  const admin = createAdminClient();
  const hash = hashShareToken(token);
  const { data } = await admin.from("spatial_project_shares").select("*").eq("token_hash", hash).maybeSingle();
  if (!data) return { admin, row: null, grants: DEFAULT_GRANTS };
  const { data: grantRow } = await admin
    .from("spatial_project_share_grants")
    .select("*")
    .eq("share_id", data.id)
    .maybeSingle();
  return {
    admin,
    row: data as ProjectShareRow,
    grants: (grantRow as ProjectShareGrants | null) ?? DEFAULT_GRANTS,
  };
}

export function projectSharePasswordOk(row: { password_hash: string | null }, password: string | null): boolean {
  if (!row.password_hash) return true;
  if (!password) return false;
  return verifySharePassword(password, row.password_hash);
}

export async function revokeProjectShare(shareId: string, orgId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("spatial_project_shares")
    .update({ is_revoked: true })
    .eq("id", shareId)
    .eq("org_id", orgId);
}

export async function recordProjectShareView(admin: ReturnType<typeof createAdminClient>, shareId: string, viewCount: number): Promise<void> {
  await admin
    .from("spatial_project_shares")
    .update({ view_count: viewCount + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", shareId);
}

export type PortalAuditEvent =
  | "portal_opened"
  | "portal_access_code_success"
  | "portal_access_code_failure"
  | "portal_item_created"
  | "portal_comment_created"
  | "portal_document_opened"
  | "portal_share_created"
  | "portal_share_revoked";

/** Dedicated audit trail for project-level portal shares — kept separate
 * from recordWalkthroughAudit so resource_type correctly reads "project",
 * not "spatial_walkthrough", for anyone reviewing org_usage_events. */
export async function recordPortalAudit(
  admin: ReturnType<typeof createAdminClient>,
  args: { orgId: string; projectId: string; shareId?: string | null; userId?: string | null; event: PortalAuditEvent; metadata?: Record<string, unknown> },
): Promise<void> {
  try {
    await admin.from("org_usage_events").insert({
      org_id: args.orgId,
      user_id: args.userId ?? null,
      event_type: `portal.${args.event}`,
      resource_type: "project",
      resource_id: args.shareId ?? args.projectId,
      resource_name: args.projectId,
      description: args.event,
      metadata: { projectId: args.projectId, shareId: args.shareId ?? null, event: args.event, ...(args.metadata ?? {}) },
    });
  } catch {
    // audit is best-effort; never block viewing
  }
}
