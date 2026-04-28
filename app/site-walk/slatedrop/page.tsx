import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SiteWalkSlateDropPage() {
  const context = await resolveServerOrgContext();
  let projects: Array<{ id: string; name: string }> = [];

  if (context.orgId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("projects")
      .select("id, name")
      .eq("org_id", context.orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50);
    projects = (data ?? []) as Array<{ id: string; name: string }>;
  }

  return (
    <main className="min-h-[calc(100dvh-96px)] bg-slate-50 px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-800"><FolderOpen className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-black">Site Walk SlateDrop</h1>
              <p className="text-sm font-bold text-slate-600">Open a Field Project folder to view photos, notes, data, plans, and deliverables.</p>
            </div>
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}/slatedrop`} className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm transition hover:border-blue-300">
              <FolderOpen className="h-6 w-6 text-blue-800" />
              <h2 className="mt-3 text-lg font-black">{project.name}</h2>
              <p className="mt-1 text-sm font-bold text-slate-600">Site Walk Files / Photos / Notes / Data / Plans / Deliverables</p>
            </Link>
          ))}
          {projects.length === 0 && <Link href="/site-walk/setup" className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-black text-slate-700">Create a Field Project first</Link>}
        </section>
      </div>
    </main>
  );
}
