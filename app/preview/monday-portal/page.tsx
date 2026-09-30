import { AecPortalLanding } from "@/components/external-portal/AecPortalLanding";
import { housewalkPortalLanding } from "@/lib/spatial-walkthrough/portal-fixtures";
import { parseExperienceProfile } from "@/lib/spatial-walkthrough/experience-profile";

export const dynamic = "force-dynamic";

export default async function MondayPortalPreview({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; profile?: string; viewport?: string }>;
}) {
  const params = await searchParams;
  const data = housewalkPortalLanding(params.theme === "client" ? "client" : "slate");
  data.profile = parseExperienceProfile(params.profile ?? "aec");
  return <AecPortalLanding data={data} compact={params.viewport === "mobile"} />;
}
