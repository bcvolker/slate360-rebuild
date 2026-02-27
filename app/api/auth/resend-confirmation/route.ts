/**
 * POST /api/auth/resend-confirmation
 * 
 * Resends the confirmation email for an existing unconfirmed account.
 * Uses Supabase admin.generateLink to get a fresh confirmation URL,
 * then sends it via Resend (branded).
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendConfirmationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/auth/callback`;

    // Generate a new confirmation link (does NOT re-create the user)
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "signup",
        email,
        password: "placeholder-not-used", // required param but ignored for existing users
        options: { redirectTo },
      });

    if (linkError) {
      console.error("Resend confirm link error:", linkError);
      return NextResponse.json({ error: linkError.message }, { status: 400 });
    }

    const confirmUrl = linkData.properties?.action_link;
    if (!confirmUrl) {
      return NextResponse.json(
        { error: "Could not generate confirmation link" },
        { status: 500 }
      );
    }

    // Look up user name from metadata
    const name = linkData.user?.user_metadata?.full_name;

    await sendConfirmationEmail({ to: email, name, confirmUrl });

    return NextResponse.json({
      success: true,
      message: "Confirmation email sent. Check your inbox.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Resend confirmation error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
