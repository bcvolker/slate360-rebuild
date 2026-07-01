import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const dynamic = "force-dynamic";

/**
 * The standalone "report builder" was a non-functional mockup. Reports ARE
 * deliverables: create one from a completed walk (which drops you into the real
 * block editor at /projects/[id]/deliverables/[id]/edit). This route now routes
 * users into that real flow instead of a dead mock.
 */
export default async function ReportBuilderRedirect() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/deliverables`);
  redirect("/site-walk/deliverables");
}
