import { redirect } from "next/navigation";
import { TokenStatePage } from "@/components/external-portal";
import { PlanWalkCanvas } from "@/components/external-portal/PlanWalkCanvas";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { PortalPage } from "@/components/external-portal/PortalPage";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";
import { loadPortalPlanWalk } from "@/lib/spatial-walkthrough/portal-plan-load";
import { sectionAllowed } from "@/lib/spatial-walkthrough/portal-gating";

export const dynamic = "force-dynamic";

/** Drawing set for this share, with the directed walk overlaid when it can be placed. */
export default async function PortalPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadPortalByToken(token);
  if (!data) return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  if (!sectionAllowed(data, "plan")) redirect(`/portal/${token}`);
  const walk = await loadPortalPlanWalk(token);

  return (
    <PortalChrome data={data} active="plan">
      <PortalPage title="Plans" meta={walk?.title && walk.title !== "Plans" ? walk.title : data.projectName} testId="portal-plan-page">
        <PlanWalkCanvas sheets={walk?.sheets ?? []} overlays={walk?.overlays ?? {}} token={token} />
      </PortalPage>
    </PortalChrome>
  );
}
