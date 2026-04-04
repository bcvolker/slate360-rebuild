/**
 * POST /api/auth/signup
 * 
 * Server-side signup that bypasses Supabase's email and sends via Resend.
 * This fixes email deliverability issues with Supabase's built-in SMTP.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendConfirmationEmail } from "@/lib/email";
import { createRateLimiter } from "@/lib/server/rate-limit";

const checkRate = createRateLimiter(5, 15 * 60 * 1000); // 5 signups per IP per 15 min

export async function POST(req: Request) {
  const blocked = checkRate(req);
  if (blocked) return blocked;

  try {
    const { email, password, name, redirectAfter } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const origin = new URL(req.url).origin;
    const next = typeof redirectAfter === "string" && redirectAfter.startsWith("/")
      ? redirectAfter
      : "/dashboard";
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

    // Use generateLink which creates user + generates confirmation link in one step
    // This does NOT send Supabase's email - we send via Resend instead
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: { full_name: name },
      },
    });

    if (linkError) {
      // Handle duplicate email gracefully
      if (linkError.message.includes("already been registered") || 
          linkError.message.includes("already exists")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
      console.error("Signup error:", linkError);
      return NextResponse.json(
        { error: linkError.message },
        { status: 400 }
      );
    }

    // Send the confirmation email via Resend
    const confirmUrl = linkData.properties?.action_link;
    console.log("[signup] action_link present:", !!confirmUrl, "user id:", linkData?.user?.id);
    let emailSent = false;
    let emailError: string | null = null;

    if (!confirmUrl) {
    return NextResponse.json(
        { error: "Account setup failed — could not generate confirmation link. Please try again." },
      { status: 500 }
    );
  }

    if (confirmUrl) {
      try {
        await sendConfirmationEmail({
          to: email,
          name,
          confirmUrl,
        });
        emailSent = true;
      } catch (err: unknown) {
        emailError = err instanceof Error ? err.message : String(err);
        console.error("[signup] Resend error detail:", { email, emailError, confirmUrlPresent: !!confirmUrl });
        // Account was created, but email failed. Surface the real reason.
        // Delete the dangling unconfirmed account
        await supabase.auth.admin.deleteUser(linkData.user.id);
}
    }

    if (emailError) {
      return NextResponse.json(
        { error: "Account created but confirmation email failed: " + emailError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account created. Check your email for your verification link.",
      emailSent: true,
    });

  } catch (error) {
    console.error("Signup handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

