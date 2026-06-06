import { notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { canAccessTwinDesktop } from "@/lib/digital-twin/desktop-access";
import { loadProgressionModels } from "@/lib/digital-twin/load-progression-models";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProgressionTimeline } from "@/components/digital-twin/desktop/ProgressionTimeline";

type Props = { params: Promise<{ id: string }> };

export default async function TwinProgressionPage({ params }: Props) {
  const { id: spaceId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!(await canAccessTwinDesktop(ctx))) notFound();

  const admin = createAdminClient();
  const { data: space } = await admin
    .from("digital_twin_spaces")
    .select("id, title")
    .eq("id", spaceId)
    .eq("org_id", ctx.orgId!)
    .is("deleted_at", null)
    .maybeSingle();

  if (!space) notFound();

  const slides = await loadProgressionModels(spaceId, ctx.orgId);

  return (
    <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 md:flex">
      <ProgressionTimeline spaceId={spaceId} spaceTitle={space.title} slides={slides} />
    </div>
  );
}
