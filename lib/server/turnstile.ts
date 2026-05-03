/**
 * Cloudflare Turnstile CAPTCHA verification.
 *
 * Requires TURNSTILE_SECRET_KEY env var (server-side only).
 * Requires NEXT_PUBLIC_TURNSTILE_SITE_KEY env var for the frontend widget.
 *
 * Set up at: https://dash.cloudflare.com → Turnstile → Add site
 *   - Choose "Invisible" or "Smart" challenge type
 *   - Add slate360.ai (and localhost for local dev) as allowed hostnames
 *   - Copy the site key → NEXT_PUBLIC_TURNSTILE_SITE_KEY
 *   - Copy the secret key → TURNSTILE_SECRET_KEY
 *
 * When TURNSTILE_SECRET_KEY is not set, verification is skipped with a
 * logged warning — this allows local/staging use without Turnstile keys
 * while ensuring production never silently bypasses verification once keys
 * are added.
 */
export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[turnstile] TURNSTILE_SECRET_KEY is not set. " +
        "CAPTCHA verification is disabled. " +
        "Add TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY to enable."
      );
    }
    return true; // permissive until keys are configured
  }

  if (!token) return false;

  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] verification request failed:", err);
    return false;
  }
}
