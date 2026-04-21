import { redirect } from "next/navigation";
import { Footprints } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { createAdminClient } from "@/lib/supabase/admin";
import WalksClient from "./WalksClient";

export const metadata = { title: "Walks — Site Walk" };
export const dynamic = "force-dynamic";

export default async function WalksPage() {
  let ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/site-walk/walks");
  const userId = ctx.user.id;

  // Auto-provision a personal organization on first visit so beta testers
  // never get stuck on a "join an organization" wall. Mirrors the pattern in
  // app/(dashboard)/dashboard/page.tsx.
  let bootstrapError: string | null = null;
  if (!ctx.orgId) {
    try {
      await ensureUserOrganization(ctx.user);
      ctx = await resolveServerOrgContext();
    } catch (error) {
      bootstrapError = error instanceof Error ? error.message : String(error);
      console.error("[site-walk/walks] org bootstrap failed", error);
    }
  }

  if (!ctx.orgId) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-sm text-slate-400 space-y-4">
        <Footprints className="h-10 w-10 mx-auto text-slate-500" />
        <p className="text-base text-foreground font-medium">
          We couldn&apos;t set up your workspace automatically.
        </p>
        <p>
          Refresh the page. If this keeps happening, email{" "}
          <a href="mailto:support@slate360.ai" className="text-cobalt hover:underline">
            support@slate360.ai
          </a>{" "}
          with the error below.
        </p>
        {bootstrapError && (
          <pre className="text-left text-xs bg-app-card border border-app rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
            {bootstrapError}
          </pre>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <a
            href="/site-walk/walks"
            className="inline-flex items-center justify-center rounded-lg bg-cobalt px-4 py-2 text-sm font-medium text-white hover:bg-cobalt-hover"
          >
            Retry
          </a>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-app px-4 py-2 text-sm font-medium text-foreground hover:border-cobalt/40"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  let { data: projects } = await admin
    .from("projects")
    .select("id, name")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Beta-tester convenience: auto-create a "My Site Walks" project on first
  // visit so the user can immediately start a walk without going through the
  // full project-creation wizard. A real project can be added later.
  if (!projects || projects.length === 0) {
    const { data: created } = await admin
      .from("projects")
      .insert({
        org_id: ctx.orgId,
        name: "My Site Walks",
        created_by: userId,
      })
      .select("id, name")
      .single();
    if (created) projects = [created];
  }

  return <WalksClient initialProjects={projects ?? []} />;
}
