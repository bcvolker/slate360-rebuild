import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeliverableViewer } from "@/components/site-walk/DeliverableViewer";
import { headers } from "next/headers";

type Props = { params: Promise<{ token: string }> };

export default async function SharedDeliverablePage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: del } = await admin
    .from("site_walk_deliverables")
    .select(
      "id, title, deliverable_type, content, status, share_token, share_revoked, share_expires_at, share_max_views, share_view_count, shared_at, org_id",
    )
    .eq("share_token", token)
    .eq("status", "shared")
    .single();

  if (!del || del.share_revoked) notFound();

  // Check expiry
  if (del.share_expires_at && new Date(del.share_expires_at) < new Date()) {
    notFound();
  }

  // Check max views
  if (del.share_max_views && del.share_view_count >= del.share_max_views) {
    notFound();
  }

  // Fetch org branding
  const { data: org } = await admin
    .from("organizations")
    .select("name, deliverable_logo_s3_key")
    .eq("id", del.org_id)
    .single();

  // Log view + increment counter
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = hdrs.get("user-agent") ?? "unknown";

  await admin.from("site_walk_deliverable_views").insert({
    deliverable_id: del.id,
    viewer_ip: ip,
    viewer_ua: ua.slice(0, 500),
  });

  await admin
    .from("site_walk_deliverables")
    .update({ share_view_count: (del.share_view_count ?? 0) + 1 })
    .eq("id", del.id);

  return (
    <DeliverableViewer
      title={del.title}
      deliverableType={del.deliverable_type}
      content={del.content ?? []}
      orgName={org?.name ?? ""}
      sharedAt={del.shared_at}
    />
  );
}
