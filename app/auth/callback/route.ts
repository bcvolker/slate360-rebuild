import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Send branded welcome email after successful confirmation (non-blocking)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await ensureUserOrganization(user);
        }

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
    // Exchange failed — could be expired or already-used token
    console.error("[auth/callback] exchangeCodeForSession error:", error?.message);
  }
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
