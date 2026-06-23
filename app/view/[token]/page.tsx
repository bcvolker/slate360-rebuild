import { loadDeliverableByToken } from "@/lib/site-walk/load-deliverable";
import {
  resolveSiteWalkShareToken,
  siteWalkDenyToPortalState,
  TokenStatePage,
} from "@/components/external-portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordDeliverableView } from "@/lib/site-walk/record-deliverable-view";
import { headers } from "next/headers";
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

  // Track the view (analytics + max-views quota) — this is the URL share emails
  // link to, so it must count just like /share/deliverable does.
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = hdrs.get("user-agent") ?? "unknown";
  await recordDeliverableView(createAdminClient(), token, ip, ua);

  return (
    <ViewerClient deliverable={deliverable} token={token} />
  );
}
