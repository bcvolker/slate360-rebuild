import { NextRequest, NextResponse } from "next/server";
import { matchesOwnerEmail, resolvePostLoginPath, isSafeInternalPath } from "@/lib/auth/post-login-path";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { syncBrandingCookie } from "@/lib/server/branding";
import { createAdminClient } from "@/lib/supabase/admin";
import { redeemInvitationToken } from "@/lib/server/invites";

const INVITE_COOKIE_NAME = "slate360_invite_token";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/app";
  // Block open-redirect: only allow relative paths that stay on our origin
  const next = isSafeInternalPath(rawNext) ? rawNext : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let redirectPath = next;
      // Org bootstrap and invite redemption must not block the redirect.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            const orgId = await ensureUserOrganization(user);
            const inviteToken = request.cookies.get(INVITE_COOKIE_NAME)?.value;

            if (inviteToken) {
              const redemption = await redeemInvitationToken(createAdminClient(), user, inviteToken);
              if (redemption.redirectPath) {
                redirectPath = redemption.redirectPath;
              }
            }

            // Sync branding cookie so Root Layout has it on first render (no FOUC)
            if (orgId) {
              await syncBrandingCookie(orgId).catch(() => {});
            }
          } catch {}

          // Default home (/app) forks for the CEO. Invite and deep-link paths stay.
          redirectPath = resolvePostLoginPath({
            isCeo: matchesOwnerEmail(user.email),
            requestedPath: redirectPath,
          });

          if (user.email) {
            const { sendWelcomeEmail } = await import("@/lib/email");
            sendWelcomeEmail({
              to: user.email,
              name: user.user_metadata?.full_name,
              confirmUrl: `${origin}${redirectPath}`,
            }).catch(() => {});
          }
        }
      } catch {} // non-blocking — don't fail the redirect

      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      response.cookies.delete(INVITE_COOKIE_NAME);
      return response;
    }
    // Exchange failed — could be expired or already-used token
    console.error("[auth/callback] exchangeCodeForSession error:", error?.message);
  }
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
