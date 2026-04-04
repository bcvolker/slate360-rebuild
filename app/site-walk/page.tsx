import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";

export default async function SiteWalkPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/site-walk");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  if (!entitlements.canAccessStandalonePunchwalk) {
    redirect("/apps?error=no_punchwalk");
  }

  const params = await searchParams;
  const isWelcome = params.welcome === "true";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-2xl text-center">
        {isWelcome && (
          <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
            <p className="font-semibold">Welcome to SiteWalk!</p>
            <p className="text-sm">Your subscription is active. Start managing field walks below.</p>
          </div>
        )}
        <h1 className="mb-4 text-3xl font-bold">SiteWalk</h1>
        <p className="mb-8 text-gray-600">
          Punch list and field walkthrough management for your projects.
        </p>
        <p className="text-sm text-gray-400">
          Full walkthrough interface coming soon.
        </p>
      </div>
    </main>
  );
}
