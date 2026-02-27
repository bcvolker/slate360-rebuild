/**
 * POST /api/auth/signup
 * 
 * Server-side signup that bypasses Supabase's email and sends via Resend.
 * This fixes email deliverability issues with Supabase's built-in SMTP.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendConfirmationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const origin = new URL(req.url).origin;
    const redirectTo = `${origin}/auth/callback`;

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
    let emailSent = false;
    let emailError: string | null = null;

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
        console.error("Email send error:", emailError);
        // Account was created, but email failed. Surface the real reason.
      }
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "Account created. Check your email for your verification link."
        : "Account created, but the confirmation email could not be sent.",
      emailSent,
      // Include error detail for debugging
      ...(emailError ? { emailError } : {}),
    });

  } catch (error) {
    console.error("Signup handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
