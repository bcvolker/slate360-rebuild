/**
 * GET /api/auth/email-diag
 * Temporary diagnostic endpoint — shows email config status (no secrets exposed).
 * DELETE THIS FILE after debugging is complete.
 */
import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const nodeEnv = process.env.NODE_ENV;

  // Test Resend API key by listing domains
  let domains: unknown = null;
  let resendError: string | null = null;
  let sendTest: unknown = null;
  let sendTestError: string | null = null;

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const res = await resend.domains.list();
      domains = res.data;
      if (res.error) resendError = res.error.message;
    } catch (err: unknown) {
      resendError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    nodeEnv,
    resendKeySet: !!resendKey,
    resendKeyPrefix: resendKey ? resendKey.substring(0, 8) + "..." : null,
    resendKeyLength: resendKey?.length ?? 0,
    emailFrom: emailFrom ?? "(not set — using fallback)",
    fallbackFrom: "Slate360 <noreply@slate360.ai>",
    effectiveFrom: emailFrom || "Slate360 <noreply@slate360.ai>",
    domains,
    resendError,
  });
}
