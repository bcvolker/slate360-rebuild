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
    if (confirmUrl) {
      try {
        await sendConfirmationEmail({
          to: email,
          name,
          confirmUrl,
        });
      } catch (emailError) {
        console.error("Email send error:", emailError);
        // User created + link generated, but email failed
        // Return success anyway - they can request a new link
      }
    }

    return NextResponse.json({
      success: true,
      message: "Account created. Check your email for verification link.",
      emailSent: !!confirmUrl,
    });

  } catch (error) {
    console.error("Signup handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
