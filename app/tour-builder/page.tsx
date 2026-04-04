import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { loadOrgFeatureFlags } from "@/lib/server/org-feature-flags";

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
  const flags = await loadOrgFeatureFlags(orgId);

  if (!flags.standalone_tour_builder) {
    redirect("/apps?error=no_tour_builder");
  }

  const params = await searchParams;
  const isWelcome = params.welcome === "true";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-2xl text-center">
        {isWelcome && (
          <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
            <p className="font-semibold">Welcome to Tour Builder!</p>
            <p className="text-sm">Your subscription is active. Start creating 360° tours below.</p>
          </div>
        )}
        <h1 className="mb-4 text-3xl font-bold">Tour Builder</h1>
        <p className="mb-8 text-gray-600">
          Create and host immersive 360° virtual tours for your projects.
        </p>
        <p className="text-sm text-gray-400">
          Full tour creation interface coming soon.
        </p>
      </div>
    </main>
  );
}
