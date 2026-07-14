import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";
import { SW360BrandingSettingsClient } from "@/components/sw360/SW360BrandingSettingsClient";

export default async function SW360BrandingPage() {
  const context = await resolveServerOrgContext();
  const orgId = context.orgId;

  const { data } = orgId
    ? await createAdminClient().from("organizations").select("brand_settings").eq("id", orgId).single()
    : { data: null };

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <SW360BackHeader href="/sw360/account" label="Account" />
      <div>
        <h1 className="text-lg font-black text-[var(--sw360-charcoal)]">Branding</h1>
        <p className="mt-0.5 text-sm text-[var(--sw360-charcoal)]/60">
          Your logo and header/footer appear on every PDF report your org generates.
        </p>
      </div>
      <SW360BrandingSettingsClient initial={(data?.brand_settings as Record<string, string>) ?? {}} />
    </div>
  );
}
