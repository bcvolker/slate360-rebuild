import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SW360StartWalkButton } from "@/components/sw360/SW360StartWalkButton";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";

type ProjectRow = { id: string; name: string };

/**
 * The Capture tab used to be a bare stub while Home's Start-Walk buttons
 * already launched real walks — a dead center tab next to working buttons
 * read as "capture is broken" (flagged by both the on-device feedback and
 * the feature-parity audit). Same start-walk plumbing as Home, just reached
 * directly from the tab so every door into capture behaves the same.
 */
export default async function SW360CapturePage() {
  const context = await resolveServerOrgContext();
  const orgId = context.orgId;

  const projectsRes = orgId
    ? await createAdminClient()
        .from("projects")
        .select("id, name")
        .eq("org_id", orgId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [] as ProjectRow[] };
  const projects = projectsRes.data ?? [];

  return (
    <div className="flex flex-col gap-5 px-4 py-6">
      <SW360BackHeader href="/sw360" label="Home" />
      <div>
        <h1 className="text-xl font-black tracking-tight text-[var(--sw360-charcoal)]">Capture</h1>
        <p className="mt-0.5 text-sm text-[var(--sw360-charcoal)]/60">
          Start a walk to shoot photos, 360s, voice, and notes.
        </p>
      </div>
      <SW360StartWalkButton projects={projects} showQuickWalk />
    </div>
  );
}
