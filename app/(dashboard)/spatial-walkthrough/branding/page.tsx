import { notFound } from "next/navigation";
import { BrandThemeForm } from "@/components/spatial-walkthrough/studio/BrandThemeForm";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveSpatialAccess } from "@/lib/spatial-walkthrough/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";
import { displayLogoPath } from "@/lib/spatial-walkthrough/logo-url";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";

export const metadata = { title: "Spatial Walkthrough branding" };

export default async function SpatialWalkthroughBrandingPage() {
  const { orgId, isSlateCeo, isAdmin } = await resolveServerOrgContext();
  const access = await resolveSpatialAccess(orgId, Boolean(isSlateCeo), Boolean(isAdmin));
  if (!access.canAuthor || !orgId) notFound();
  const admin = createAdminClient();
  const [{ data }, entitlements] = await Promise.all([
    admin.from("spatial_org_themes").select("*").eq("org_id", orgId).maybeSingle(),
    resolveOrgEntitlements(orgId),
  ]);
  const theme = resolveBrandTheme({
    org: data
      ? {
          logoUrl: displayLogoPath(Boolean(data.logo_display_key || data.logo_key)),
          primaryColor: data.primary_color,
          secondaryColor: data.secondary_color,
          accentColor: data.accent_color,
          pageBgColor: data.page_bg_color,
          surfaceColor: data.surface_color,
          textColor: data.text_color,
          mutedTextColor: data.muted_text_color,
          logoTreatment: data.logo_treatment,
          showPoweredBy: data.show_powered_by,
        }
      : {},
    canHidePoweredBy: entitlements.canWhiteLabel,
  });
  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 text-2xl font-semibold text-[var(--graphite-text-header)]">Branding</h1>
      <BrandThemeForm initial={theme} />
    </div>
  );
}
