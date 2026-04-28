import { HardHat } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteWalkLaunchGrid } from "./_components/SiteWalkLaunchGrid";

const isAppStoreMode = process.env.NEXT_PUBLIC_APP_STORE_MODE === "true";

export default async function SiteWalkPage() {
  const context = await resolveServerOrgContext();
  let projects: Array<{ id: string; name: string }> = [];

  if (context.orgId) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("projects")
        .select("id, name")
        .eq("org_id", context.orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);
      projects = (data ?? []) as Array<{ id: string; name: string }>;
    } catch (error) {
      console.error("Site Walk project list failed", error);
    }
  }

  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm sm:p-8">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
              <HardHat className="h-4 w-4" /> Field-tested workspace
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Site Walk
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-700 sm:text-lg">
                Capture field truth, coordinate with office support, and turn verified work into branded client deliverables.
              </p>
            </div>
          </div>
        </section>

        <SiteWalkLaunchGrid projects={projects} appStoreMode={isAppStoreMode} />
      </div>
    </main>
  );
}
