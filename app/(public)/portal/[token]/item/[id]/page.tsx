import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";
import { walkthroughHref } from "@/lib/spatial-walkthrough/project-items";

export const dynamic = "force-dynamic";

export default async function PortalItemPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const data = await loadPortalByToken(token);
  if (!data) {
    return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  }
  const admin = createAdminClient();
  const { data: pin } = await admin
    .from("spatial_pins")
    .select("id, label, body, pin_type, status, visibility, t_seconds, yaw_deg, pitch_deg, clip_id, walkthrough_id, project_id")
    .eq("id", id)
    .maybeSingle();
  // Reachable as an item (Items packaged) or as the home of a shared document.
  const asItem = data.items.some((item) => item.id === id);
  const asDocument = data.documents.some((doc) => doc.href === `/portal/${token}/item/${id}`);
  const listed = asItem || asDocument;
  if (!pin || pin.visibility === "internal" || !listed) {
    return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  }
  const { data: attachments } = data.capabilities?.documents
    ? await admin.from("spatial_pin_attachments").select("id, title, kind").eq("pin_id", pin.id)
    : { data: [] as Array<{ id: string; title: string | null; kind: string | null }> };
  const atLocation = walkthroughHref({
    basePath: `/w/${token}`,
    locator: {
      walkthroughId: pin.walkthrough_id,
      clipId: pin.clip_id,
      chapterId: null,
      tSeconds: pin.t_seconds,
      yawDeg: pin.yaw_deg,
      pitchDeg: pin.pitch_deg,
    },
  });
  // Only surfaces this link actually serves; nothing greyed out or "not on this visit".
  const candidates: Array<[string, string | null | undefined]> = [
    ["Walkthrough", data.capabilities?.walkthrough ? atLocation : null],
    ["Plan", data.planHref],
    ["360 Station", data.reality?.stationsHref],
    ["Reality Twin", data.reality?.twinHref],
  ];
  const locators = candidates.filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <PortalChrome data={data} active={asItem ? "items" : "documents"}>
      <main className="px-4 py-6 sm:px-8" data-testid="portal-item-page">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
          {pin.pin_type} · {pin.status ?? "open"}
        </p>
        <h1 className="text-xl font-semibold">{pin.label}</h1>
        {pin.body ? <p className="mt-4 max-w-2xl text-sm text-[var(--graphite-text-body)]">{pin.body}</p> : null}
        {locators.length ? (
          <section className="mt-8" data-testid="spatial-references">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
              See it in place
            </p>
            <div className="flex flex-wrap gap-2">
              {locators.map(([label, href]) => (
                <a key={label} href={href} className="inline-flex min-h-12 items-center border border-white/20 px-4 text-sm">
                  {label}
                </a>
              ))}
            </div>
          </section>
        ) : null}
        {attachments?.length ? (
          <section className="mt-8" data-testid="portal-item-docs">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Documents</p>
            {attachments.map((doc) =>
              data.capabilities?.walkthrough ? (
                <a key={doc.id} href={atLocation} className="mb-2 flex min-h-12 items-center border border-white/10 px-4 text-sm">
                  {doc.title || doc.kind}
                </a>
              ) : (
                <p key={doc.id} className="mb-2 flex min-h-12 items-center border border-white/10 px-4 text-sm">
                  {doc.title || doc.kind}
                </p>
              ),
            )}
          </section>
        ) : null}
      </main>
    </PortalChrome>
  );
}
