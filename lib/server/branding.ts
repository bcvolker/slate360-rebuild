import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_BRANDING, type OrgBranding } from "@/lib/types/branding";

const BRANDING_COOKIE = "sb-branding";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Fetch branding for an organization.
 *
 * If the org has a custom branding row, each non-null column overrides the
 * Slate360 default. If the row is missing or the query fails, the full
 * Slate360 default branding is returned with `is_default: true`.
 *
 * This function never throws — UI code can always destructure the result.
 */
export async function getOrgBranding(orgId: string): Promise<OrgBranding> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("org_branding")
      .select("logo_url, logo_dark_url, favicon_url, brand_name, primary_color, accent_color, font_family")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_BRANDING;
    }

    // Merge: non-null DB values override defaults, null columns keep defaults
    return {
      is_default: false,
      logo_url: data.logo_url ?? DEFAULT_BRANDING.logo_url,
      logo_dark_url: data.logo_dark_url ?? DEFAULT_BRANDING.logo_dark_url,
      favicon_url: data.favicon_url ?? DEFAULT_BRANDING.favicon_url,
      brand_name: data.brand_name ?? DEFAULT_BRANDING.brand_name,
      primary_color: data.primary_color ?? DEFAULT_BRANDING.primary_color,
      accent_color: data.accent_color ?? DEFAULT_BRANDING.accent_color,
      font_family: data.font_family ?? DEFAULT_BRANDING.font_family,
    };
  } catch {
    // Network failure, RLS denial, etc — never crash the UI
    return DEFAULT_BRANDING;
  }
}

/**
 * Fetch branding and set the `sb-branding` cookie.
 * Call this on login/callback so the Root Layout can read it
 * without a DB round-trip (eliminates branding FOUC).
 */
export async function syncBrandingCookie(orgId: string): Promise<OrgBranding> {
  const branding = await getOrgBranding(orgId);
  const jar = await cookies();
  jar.set(BRANDING_COOKIE, JSON.stringify(branding), {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false, // layout reads this on the server; client may need it too
    secure: process.env.NODE_ENV === "production",
  });
  return branding;
}

/**
 * Read branding from the cookie set at login.
 * Returns `DEFAULT_BRANDING` if the cookie is missing or malformed.
 * Safe to call in any Server Component — no DB hit.
 */
export async function readBrandingCookie(): Promise<OrgBranding> {
  try {
    const jar = await cookies();
    const raw = jar.get(BRANDING_COOKIE)?.value;
    if (!raw) return DEFAULT_BRANDING;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "primary_color" in parsed) {
      return parsed as OrgBranding;
    }
    return DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}
