/**
 * GET /auth/reset-password?token_hash=xxx&type=recovery
 *
 * Handles the password-reset link sent by Supabase Auth.
 * Verifies the OTP token hash (which establishes a session),
 * then redirects to the reset-password form page.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    console.error("[auth/reset-password] verifyOtp error:", error.message);
  }

  return NextResponse.redirect(
    `${origin}/forgot-password?error=reset-link-expired`,
  );
}
