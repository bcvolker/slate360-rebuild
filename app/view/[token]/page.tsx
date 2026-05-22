import { loadDeliverableByToken } from "@/lib/site-walk/load-deliverable";
import {
  resolveSiteWalkShareToken,
  siteWalkDenyToPortalState,
  TokenStatePage,
} from "@/components/external-portal";
import ViewerClient from "./ViewerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deliverable — Slate360",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ViewDeliverablePage({ params }: Props) {
  const { token } = await params;
  const gate = await resolveSiteWalkShareToken(token);

  if (!gate.ok) {
    return (
      <TokenStatePage
        state={siteWalkDenyToPortalState(gate.reason)}
        badge="Deliverable review"
      />
    );
  }

  const deliverable = await loadDeliverableByToken(token);
  if (!deliverable) {
    return <TokenStatePage state="unavailable" badge="Deliverable review" />;
  }

  if (deliverable.items.length === 0) {
    return (
      <TokenStatePage
        state="empty"
        badge="Deliverable review"
        title={deliverable.title}
        description="This deliverable does not contain any reviewable items yet."
      />
    );
  }

  return (
    <ViewerClient deliverable={deliverable} token={token} />
  );
}
