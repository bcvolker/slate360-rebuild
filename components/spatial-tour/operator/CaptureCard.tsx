import type { TourBundle } from "@/lib/spatial-tour/types";
import { CaptureCardControls } from "./CaptureCardControls";

/**
 * Repeat-visit capture card: route order, reference stills from the earliest visit,
 * per-checkpoint notes and a line to record deviations on the day. Prints on white.
 */
export function CaptureCard({
  projectId,
  bundle,
  stillUrl,
}: {
  projectId: string;
  bundle: TourBundle & { route: NonNullable<TourBundle["route"]> };
  stillUrl: (markId: string) => string;
}) {
  const route = bundle.route;
  const visitOrder = new Map(bundle.visits.map((v, i) => [v.walkthroughId, i]));
  const reference = (checkpointId: string) =>
    bundle.marks
      .filter((m) => m.checkpointId === checkpointId && m.match === "matched" && m.stillStatus === "ready")
      .sort((a, b) => (visitOrder.get(a.walkthroughId) ?? 0) - (visitOrder.get(b.walkthroughId) ?? 0))[0];
  const chapters = bundle.chapters.filter((c) => !c.retiredAt);
  const cone = bundle.visits.flatMap((v) => v.clips).find((c) => c.lookCone)?.lookCone ?? null;
  let n = 0;

  return (
    <main className="min-h-[100dvh] bg-[var(--graphite-canvas)] px-4 py-8 print:bg-white print:p-0">
    <article className="mx-auto max-w-3xl space-y-6 text-[var(--graphite-text-header)] print:max-w-none print:text-black">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--graphite-muted)] print:text-black">
          Capture card · revision {route.revision}
        </p>
        <h1 className="text-2xl font-semibold">{route.name}</h1>
        <CaptureCardControls projectId={projectId} notes={route.captureNotes} />
      </header>
      <section className="break-inside-avoid space-y-2" data-testid="capture-card-sop">
        <h2 className="border-b border-[var(--mobile-app-card-border)] pb-1 text-lg font-semibold print:border-black">Every visit</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Mast a couple of feet ahead of you, camera above your head. Use the same heights every visit.</li>
          <li>Walk the route in the order below, facing the way you walk. Forward is your direction of travel.</li>
          <li>
            Keep yourself behind and under the camera, out of the published view
            {cone ? ` (${Math.round(cone.halfWidthDeg * 2)}° forward, down to ${cone.pitchMinDeg}°)` : ""}. No masks: if you
            are in the view, the take is redone.
          </li>
          <li>Pause two seconds at each checkpoint, facing its reference view.</li>
          <li>Write down anything you could not reach or had to do differently.</li>
        </ol>
      </section>
      {chapters.map((chapter) => {
        const points = bundle.checkpoints.filter((c) => c.chapterId === chapter.id && !c.retiredAt);
        if (!points.length) return null;
        return (
          <section key={chapter.id} className="break-inside-avoid space-y-3">
            <h2 className="border-b border-[var(--mobile-app-card-border)] pb-1 text-lg font-semibold print:border-black">{chapter.name}</h2>
            <ol className="space-y-4">
              {points.map((cp) => {
                n += 1;
                const ref = reference(cp.id);
                return (
                  <li key={cp.id} className="flex break-inside-avoid gap-4">
                    <span className="w-6 shrink-0 font-mono text-sm tabular-nums">{n}</span>
                    {ref ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stillUrl(ref.id)} alt="" className="h-24 w-48 shrink-0 rounded-lg object-cover print:rounded-none" />
                    ) : (
                      <span className="flex h-24 w-48 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--mobile-app-card-border)] text-xs text-[var(--graphite-muted)] print:rounded-none print:border-black print:text-black">
                        No reference still yet
                      </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold">{cp.label}</p>
                      {cp.captureNote ? <p className="text-sm text-[var(--graphite-muted)] print:text-black">{cp.captureNote}</p> : null}
                      <p className="pt-2 text-xs text-[var(--graphite-muted)] print:text-black">Deviation or not accessible: ________________________________</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {n === 0 ? (
        <p className="text-sm text-[var(--graphite-muted)]">Add checkpoints on the route first; they appear here in walking order.</p>
      ) : null}
    </article>
    </main>
  );
}
