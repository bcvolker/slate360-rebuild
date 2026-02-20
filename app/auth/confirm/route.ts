/**
 * GET /auth/confirm?token_hash=xxx&type=email
 *
 * Handles the email confirmation link sent by Supabase Auth.
 * Verifies the OTP token hash and redirects to the dashboard on success.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (!error) {
      // Send branded welcome email after successful verification (non-blocking)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          const { sendWelcomeEmail } = await import("@/lib/email");
          sendWelcomeEmail({
            to: user.email,
            name: user.user_metadata?.full_name,
            confirmUrl: `${origin}/dashboard`,
          }).catch(() => {});
        }
      } catch {} // non-blocking — don't fail the redirect

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-confirm-failed`);
}
