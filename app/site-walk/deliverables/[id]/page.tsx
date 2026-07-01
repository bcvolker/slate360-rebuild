import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDeliverableById } from "@/lib/site-walk/load-deliverable-by-id";
import ViewerClient from "@/app/view/[token]/ViewerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deliverable preview — Slate360",
};

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Authenticated owner preview of a deliverable by id — the in-app target for the
 * SlateDrop `deliverable://<id>` link. Unlike `/view/[token]` this works for drafts/
 * unshared deliverables, never burns a share view, and isn't blocked by share
 * expiry/revocation. Reuses the same ViewerClient (token-less) and viewer model.
 */
export default async function OwnerDeliverablePage({ params }: Props) {
  const { id } = await params;

  const { user, orgId } = await resolveServerOrgContext();
  if (!user) redirect(`/login?next=/site-walk/deliverables/${id}`);
  if (!orgId) notFound();

  const deliverable = await loadDeliverableById(id, orgId);
  if (!deliverable || deliverable.items.length === 0) notFound();

  // Owner arrived from the deliverables list — give them an in-app back control so the
  // immersive viewer isn't a dead-end (browser-back only).
  return <ViewerClient deliverable={deliverable} backHref="/site-walk/deliverables" editableTitle />;
}
