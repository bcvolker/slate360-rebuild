import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { docKindLabel, portalPrimaryBtn, portalSecondaryBtn, sentence } from "@/components/external-portal/PortalPage";
import { portalCard, portalKicker } from "@/components/external-portal/PortalProjectSections";
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
  // Only surfaces this link actually serves (client words); nothing greyed out or "not on this visit".
  const candidates: Array<[string, string | null | undefined]> = [
    ["See in walkthrough", data.capabilities?.walkthrough ? atLocation : null],
    ["Plans", data.planHref],
    ["360 photos", data.reality?.stationsHref],
    ["3D Scan", data.reality?.twinHref],
  ];
  const locators = candidates.filter((row): row is [string, string] => Boolean(row[1]));
  const back = asItem ? { label: "Items", href: `/portal/${token}/items` } : { label: "Documents", href: `/portal/${token}/documents` };
  const docs = attachments ?? [];

  return (
    <PortalChrome data={data} active={asItem ? "items" : "documents"}>
      <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6" data-testid="portal-item-page">
        <a href={back.href} className="text-sm font-medium text-[var(--portal-ink-muted)] hover:text-[var(--portal-ink)]">
          ← {back.label}
        </a>
        <div className={`grid items-start gap-4 ${docs.length ? "lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]" : ""}`}>
          <section className={`${portalCard} p-5`}>
            <p className={portalKicker}>
              {sentence(pin.pin_type)} · {sentence(pin.status ?? "open")}
            </p>
            <h1 className="mt-1 break-words font-serif text-2xl text-[var(--portal-ink)] sm:text-[1.7rem]">{pin.label}</h1>
            {pin.body ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--portal-ink)]">{pin.body}</p> : null}
            {locators.length ? (
              <div className="mt-5 flex flex-wrap gap-2" data-testid="spatial-references">
                {locators.map(([label, href], i) => (
                  <a key={label} href={href} className={i === 0 ? portalPrimaryBtn : portalSecondaryBtn}>
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
          </section>
          {docs.length ? (
            <section className={`${portalCard} overflow-hidden`} data-testid="portal-item-docs">
              <p className={`${portalKicker} border-b border-[var(--portal-line)] px-4 py-3`}>Documents</p>
              <div className="divide-y divide-[var(--portal-line)]">
                {docs.map((doc) =>
                  data.capabilities?.walkthrough ? (
                    <a key={doc.id} href={atLocation} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--portal-canvas)]">
                      <span className="break-words text-sm font-medium text-[var(--portal-ink)]">{doc.title || docKindLabel(doc.kind ?? "file")}</span>
                      <span className="shrink-0 text-xs text-[var(--portal-ink-muted)]">In the walkthrough</span>
                    </a>
                  ) : (
                    <p key={doc.id} className="px-4 py-3 text-sm font-medium text-[var(--portal-ink)]">
                      {doc.title || docKindLabel(doc.kind ?? "file")}
                    </p>
                  ),
                )}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </PortalChrome>
  );
}
