import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SW360NewProjectButton } from "@/components/sw360/SW360NewProjectButton";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";

export default async function SW360ProjectsPage() {
  const context = await resolveServerOrgContext();
  const orgId = context.orgId;

  const { data } = orgId
    ? await createAdminClient()
        .from("projects")
        .select("id, name, description, created_at")
        .eq("org_id", orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; name: string; description: string | null; created_at: string }[] };
  const projects = data ?? [];

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <SW360BackHeader href="/sw360" label="Home" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight text-[var(--sw360-charcoal)]">Projects</h1>
        <SW360NewProjectButton />
      </div>

      {projects.length === 0 ? (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--sw360-charcoal)]/25 bg-white/40 px-6 text-center">
          <p className="text-sm font-bold text-[var(--sw360-charcoal)]">No projects yet</p>
          <p className="text-xs text-[var(--sw360-charcoal)]/60">
            A project keeps every walk, plan, and report for a job in one place — create one
            with the + above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/sw360/projects/${p.id}`}
              className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-3"
            >
              <p className="truncate text-sm font-semibold text-[var(--sw360-charcoal)]">{p.name}</p>
              {p.description ? (
                <p className="mt-0.5 truncate text-xs text-[var(--sw360-charcoal)]/60">{p.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
