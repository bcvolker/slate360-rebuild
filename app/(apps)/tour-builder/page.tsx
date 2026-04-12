import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { TourBuilderShell } from "@/components/tours/TourBuilderShell";

export default async function TourBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/tour-builder");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  if (!entitlements.canAccessStandaloneTourBuilder) {
    redirect("/dashboard?error=no_tour_builder");
  }

  const params = await searchParams;
  const isWelcome = params.welcome === "true";

  return (
    <main className="flex min-h-screen flex-col p-6">
      {isWelcome && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
          <p className="font-semibold">Welcome to Tour Builder!</p>
          <p className="text-sm">Your subscription is active. Start creating 360° tours below.</p>
        </div>
      )}
      <TourBuilderShell />
    </main>
  );
}
