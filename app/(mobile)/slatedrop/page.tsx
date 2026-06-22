import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Cloud, FolderOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "@/components/mobile-system/mobileTokens";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "SlateDrop — Slate360" };
export const dynamic = "force-dynamic";

type ProjectRow = { id: string; name: string };

export default async function SlateDropPage() {
  const { user, orgId } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/slatedrop");

  const admin = createAdminClient();
  let query = admin
    .from("projects")
    .select("id, name")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);
  query = orgId ? query.eq("org_id", orgId) : query.eq("created_by", user.id);
  const { data } = await query;
  const projects = (data ?? []) as ProjectRow[];

  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={cn(mobileTokens.mobileIconWell, "h-12 w-12")} aria-hidden>
          <Cloud className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <p className={cn("mt-4", mobileTokens.mobileEyebrowLabel)}>SlateDrop</p>
        <h1 className={cn("mt-1", mobileTokens.moduleTitle)}>Files</h1>
        <p className={mobileTokens.moduleSubtitle}>
          Choose a project to browse, organize, and share its files.
        </p>
      </section>

      <section className={cn(mobileTokens.panelBase, "overflow-hidden")}>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className={cn(mobileTokens.mobileIconWell, "h-11 w-11")} aria-hidden>
              <FolderOpen className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="text-sm font-semibold text-white">No projects yet</p>
            <p className="max-w-xs text-xs text-zinc-400">
              SlateDrop files are organized by project. Create a project to start adding files.
            </p>
            <Link
              href="/projects"
              className="mt-1 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--graphite-primary)] px-4 text-sm font-semibold text-[var(--graphite-canvas)]"
            >
              <Plus className="h-4 w-4" aria-hidden /> New project
            </Link>
          </div>
        ) : (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/slatedrop`}
              className={mobileTokens.mobileGlassRowLink}
            >
              <span className={cn(mobileTokens.mobileIconWell, "h-9 w-9")}>
                <FolderOpen className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{project.name}</span>
                <span className="mt-0.5 block truncate text-xs text-zinc-400">Browse files</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
