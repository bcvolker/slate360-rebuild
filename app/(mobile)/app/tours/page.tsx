import { Suspense } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTours } from "@/lib/tours/queries";
import { listScopedProjectsForUser } from "@/lib/projects/access";
import { TourMobileImportShell } from "@/components/tours/mobile/TourMobileImportShell";

export const metadata = {
  title: "360° Tours — Slate360",
  description: "Import 360° photos from the field and build a tour.",
};

export default async function MobileToursPage() {
  const { user, orgId } = await resolveServerOrgContext();

  let recentTours: Awaited<ReturnType<typeof getTours>> = [];
  if (orgId) {
    try {
      const admin = createAdminClient();
      recentTours = (await getTours(admin, { orgId })).slice(0, 5);
    } catch (err) {
      console.error("[app/tours] failed to load recent tours", err);
    }
  }

  // Real projects the user can attach a tour to (the hidden "360 Library"
  // system project is already excluded here — see EXCLUDE_SYSTEM_PROJECTS_FILTER).
  let projects: Array<{ id: string; name: string }> = [];
  if (user) {
    try {
      const { projects: scoped } = await listScopedProjectsForUser(user.id);
      projects = scoped.map((p) => ({ id: p.id, name: p.name }));
    } catch (err) {
      console.error("[app/tours] failed to load projects", err);
    }
  }

  return (
    <Suspense fallback={null}>
      <TourMobileImportShell recentTours={recentTours} projects={projects} />
    </Suspense>
  );
}
