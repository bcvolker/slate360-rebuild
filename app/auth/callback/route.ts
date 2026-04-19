import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { syncBrandingCookie } from "@/lib/server/branding";
import { createAdminClient } from "@/lib/supabase/admin";
import { redeemInvitationToken } from "@/lib/server/invites";

const INVITE_COOKIE_NAME = "slate360_invite_token";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  // Block open-redirect: only allow relative paths that stay on our origin
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("://")
    ? rawNext
    : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      let redirectPath = next;
      // Send branded welcome email after successful confirmation (non-blocking)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
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
