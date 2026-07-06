import { Suspense } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTours } from "@/lib/tours/queries";
import { TourMobileImportShell } from "@/components/tours/mobile/TourMobileImportShell";

export const metadata = {
  title: "360° Tours — Slate360",
  description: "Import 360° photos from the field and build a tour.",
};

export default async function MobileToursPage() {
  const { orgId } = await resolveServerOrgContext();

  let recentTours: Awaited<ReturnType<typeof getTours>> = [];
  if (orgId) {
    try {
      const admin = createAdminClient();
      recentTours = (await getTours(admin, { orgId })).slice(0, 5);
    } catch (err) {
      console.error("[app/tours] failed to load recent tours", err);
    }
  }

  return (
    <Suspense fallback={null}>
      <TourMobileImportShell recentTours={recentTours} />
    </Suspense>
  );
}
