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
  const listed = data.items.some((item) => item.id === id);
  if (!pin || pin.visibility === "internal" || !listed) {
    return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  }
  const { data: attachments } = await admin
    .from("spatial_pin_attachments")
    .select("id, title, kind")
    .eq("pin_id", pin.id);
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
  const locators = [
    ["Walkthrough", atLocation],
    ["Plan", data.planHref],
    ["360 Station", data.reality?.stationsHref ?? null],
    ["Reality Twin", data.reality?.twinHref ?? null],
  ] as const;

  return (
    <PortalChrome data={data} active="items">
      <main className="px-4 py-6 sm:px-8" data-testid="portal-item-page">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
          {pin.pin_type} · {pin.status ?? "open"}
        </p>
        <h1 className="text-xl font-semibold">{pin.label}</h1>
        {pin.body ? <p className="mt-4 max-w-2xl text-sm text-[var(--graphite-text-body)]">{pin.body}</p> : null}
        <section className="mt-8" data-testid="spatial-references">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
            Open from every surface
          </p>
          <div className="flex flex-wrap gap-2">
            {locators.map(([label, href]) =>
              href ? (
                <a key={label} href={href} className="inline-flex min-h-12 items-center border border-white/20 px-4 text-sm">
                  {label}
                </a>
              ) : (
                <p key={label} className="inline-flex min-h-12 items-center border border-white/10 px-4 text-sm text-[var(--graphite-muted)]">
                  {label} not on this visit
                </p>
              ),
            )}
          </div>
        </section>
        <section className="mt-8" data-testid="portal-item-docs">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Documents</p>
          {(attachments ?? []).map((doc) => (
            <a key={doc.id} href={atLocation} className="mb-2 flex min-h-12 items-center border border-white/10 px-4 text-sm">
              {doc.title || doc.kind}
            </a>
          ))}
        </section>
      </main>
    </PortalChrome>
  );
}
