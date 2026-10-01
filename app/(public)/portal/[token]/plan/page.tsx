import { redirect } from "next/navigation";
import { TokenStatePage } from "@/components/external-portal";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";

export const dynamic = "force-dynamic";

/**
 * Plans are not offered in the client portal until there is a real plan viewer
 * (packaging never enables the section today), so this route always returns to the
 * overview: no placeholder page, no locked teaser.
 */
export default async function PortalPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadPortalByToken(token);
  if (!data) return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  redirect(`/portal/${token}`);
}
