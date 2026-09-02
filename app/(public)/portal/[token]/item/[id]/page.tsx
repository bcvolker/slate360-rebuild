import { TokenStatePage } from "@/components/external-portal";
import { ViewerBrandMark } from "@/components/shared/ViewerBrandMark";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadShareRow, shareDenied } from "@/lib/spatial-walkthrough/share-resolve";
import { walkthroughHref } from "@/lib/spatial-walkthrough/project-items";

export const dynamic = "force-dynamic";

export default async function PortalItemPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const walk = await loadShareRow(token);
  if (!walk.row || shareDenied(walk.row)) {
    return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  }
  const admin = createAdminClient();
  const { data: pin } = await admin
    .from("spatial_pins")
    .select("id, label, body, pin_type, status, visibility, t_seconds, yaw_deg, pitch_deg, clip_id, walkthrough_id")
    .eq("id", id)
    .eq("walkthrough_id", walk.row.walkthrough_id)
    .maybeSingle();
  if (!pin || pin.visibility === "internal") {
    return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  }
  const { data: attachments } = await admin
    .from("spatial_pin_attachments")
    .select("id, title, kind")
    .eq("pin_id", pin.id);
  const locator = {
    walkthroughId: pin.walkthrough_id,
    clipId: pin.clip_id,
    chapterId: null,
    tSeconds: pin.t_seconds,
    yawDeg: pin.yaw_deg,
    pitchDeg: pin.pitch_deg,
  };
  const atLocation = walkthroughHref({ basePath: `/w/${token}`, locator });

  return (
    <main className="min-h-[100dvh] bg-[var(--graphite-canvas)] px-4 py-6 text-[var(--graphite-text-header)] sm:px-8" data-testid="portal-item-page">
      <header className="mb-6 flex items-center gap-3">
        <ViewerBrandMark />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
            {pin.pin_type} · {pin.status ?? "open"}
          </p>
          <h1 className="text-xl font-semibold">{pin.label}</h1>
        </div>
      </header>
      {pin.body ? <p className="mb-6 max-w-2xl text-sm text-[var(--graphite-text-body)]">{pin.body}</p> : null}
      <div className="mb-8 flex flex-wrap gap-2">
        <a href={atLocation} className="inline-flex min-h-12 items-center border border-white/20 px-4 text-sm">
          Open at location
        </a>
        <a href={`/portal/${token}`} className="inline-flex min-h-12 items-center border border-white/10 px-4 text-sm">
          Back to project
        </a>
      </div>
      <section className="mb-8" data-testid="spatial-references">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
          Spatial references ({1})
        </p>
        <a href={atLocation} className="inline-flex min-h-12 items-center border border-white/10 px-4 text-sm">
          {`t ${pin.t_seconds ?? 0}s · yaw ${Math.round(pin.yaw_deg ?? 0)} · pitch ${Math.round(pin.pitch_deg ?? 0)}`}
        </a>
      </section>
      <section data-testid="portal-item-docs">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Documents</p>
        {(attachments ?? []).map((doc) => (
          <a key={doc.id} href={`${atLocation}&pin=${pin.id}`} className="mb-2 flex min-h-12 items-center border border-white/10 px-4 text-sm">
            {doc.title || doc.kind}
          </a>
        ))}
      </section>
      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
        Client replies persist after project-item tables are applied. Email/push is not wired.
      </p>
    </main>
  );
}
