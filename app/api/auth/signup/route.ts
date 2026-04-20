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

const checkRate = createRateLimiter("auth:signup", 5, 900); // 5 signups per IP per 15 min

export async function POST(req: Request) {
  const blocked = await checkRate(req);
  if (blocked) return blocked;

  try {
    const {
      email,
      password,
      name,
      firstName,
      lastName,
      phone,
      redirectAfter,
      demographics,
    } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const fullName: string =
      typeof name === "string" && name.trim().length > 0
        ? name.trim()
        : `${firstName ?? ""} ${lastName ?? ""}`.trim();

    // Demographics are required at signup. We persist them into
    // user_metadata AND into the profiles row so the operations console
    // can segment users by industry, role, company size, and referral source.
    const demo = demographics && typeof demographics === "object" ? demographics : {};
    const metadata: Record<string, unknown> = { full_name: fullName };
    if (typeof firstName === "string" && firstName.length > 0) metadata.first_name = firstName;
    if (typeof lastName === "string" && lastName.length > 0) metadata.last_name = lastName;
    if (typeof phone === "string" && phone.length > 0) metadata.phone = phone;
    for (const key of ["company", "jobTitle", "industry", "companySize", "referralSource"] as const) {
      const v = (demo as Record<string, unknown>)[key];
      if (typeof v === "string" && v.length > 0) metadata[key] = v;
    }
    metadata.signupAt = new Date().toISOString();

    const supabase = createAdminClient();
    const origin = new URL(req.url).origin;
    const next = typeof redirectAfter === "string" && redirectAfter.startsWith("/")
      ? redirectAfter
      : "/welcome";
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

    // Use generateLink which creates user + generates confirmation link in one step
    // This does NOT send Supabase's email - we send via Resend instead
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: metadata,
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

    if (!confirmUrl) {
    return NextResponse.json(
        { error: "Account setup failed — could not generate confirmation link. Please try again." },
      { status: 500 }
    );
  }

    // Upsert profile row so operations console + onboarding flow can
    // read demographics immediately. Confirmation hasn't happened yet
    // but the auth.users row exists, so the FK is satisfied.
    if (linkData.user?.id) {
      const profileRow: Record<string, unknown> = {
        id: linkData.user.id,
        email,
        first_name: typeof firstName === "string" ? firstName : null,
        last_name: typeof lastName === "string" ? lastName : null,
        organization_name:
          typeof (demo as Record<string, unknown>).company === "string"
            ? (demo as Record<string, unknown>).company
            : null,
        role:
          typeof (demo as Record<string, unknown>).jobTitle === "string"
            ? (demo as Record<string, unknown>).jobTitle
            : null,
        industry:
          typeof (demo as Record<string, unknown>).industry === "string"
            ? (demo as Record<string, unknown>).industry
            : null,
        company_size:
          typeof (demo as Record<string, unknown>).companySize === "string"
            ? (demo as Record<string, unknown>).companySize
            : null,
        referral_source:
          typeof (demo as Record<string, unknown>).referralSource === "string"
            ? (demo as Record<string, unknown>).referralSource
            : null,
        phone: typeof phone === "string" && phone.length > 0 ? phone : null,
      };
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileRow, { onConflict: "id" });
      if (profileError) {
        console.warn("[signup] profile upsert failed (non-fatal):", profileError.message);
      }
    }

    let emailError: string | null = null;

    if (confirmUrl) {
      try {
        await sendConfirmationEmail({
          to: email,
          name: fullName,
          confirmUrl,
        });
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

