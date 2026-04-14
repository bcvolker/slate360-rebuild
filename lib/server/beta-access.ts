import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Canonical owner email check.
 *
 * Uses `CEO_EMAIL` env var (set in .env / Vercel). Returns `false`
 * when the env var is missing — owner access is never silently granted
 * by a hardcoded fallback.
 */
export function isOwnerEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const ownerEmail = process.env.CEO_EMAIL;
  if (!ownerEmail) {
    console.warn("[beta-access] CEO_EMAIL env var is not set — owner access disabled");
    return false;
  }
  return email.toLowerCase() === ownerEmail.toLowerCase();
}

/**
 * Query `profiles.is_beta_approved` for a given user ID.
 *
 * Returns `true` only when the column exists AND is explicitly `true`.
 * Returns `false` for any error, missing row, missing column, or null
 * value — this is the **fail-closed** guarantee.
 */
/**
 * React `cache()`-wrapped so the query runs at most once per
 * server request, even when both the layout (`requireBetaAccess`)
 * and the page (`resolveServerOrgContext`) call it.
 */
export const checkBetaApproved = cache(async (userId: string): Promise<boolean> => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("is_beta_approved")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[beta-access] profiles query failed:", error.message);
      return false; // fail closed
    }

    return data?.is_beta_approved === true;
  } catch (err) {
    console.error("[beta-access] unexpected error:", err);
    return false; // fail closed
  }
});

/**
 * Enforce beta access for a server page/layout.
 *
 * Call this at the top of any server component that should be
 * beta-gated. It will `redirect()` (throw) if the user is not
 * approved, so code after this call is guaranteed to run only
 * for approved users or the owner.
 *
 * Owner email bypasses the DB check (they always have access).
 */
export async function requireBetaAccess(user: User | null): Promise<void> {
  if (!user) {
    redirect("/login");
  }

  // Owner always has access — no DB check needed
  if (isOwnerEmail(user.email)) {
    return;
  }

  const approved = await checkBetaApproved(user.id);
  if (!approved) {
    redirect("/beta-pending");
  }
}
