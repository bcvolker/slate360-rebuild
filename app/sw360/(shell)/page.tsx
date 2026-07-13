/**
 * SW360 Home — B2.0 stub. The real Home (Start/Resume walk, Needs attention,
 * Assigned to you, active projects) lands in B2.2; this slice's job is the
 * app's existence and brand, not a finished screen.
 */
export default function SW360HomePage() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[var(--sw360-charcoal)]">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-[var(--sw360-charcoal)]/60">
          Site Walk 360 is being built out in this build train — Home is coming next.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-5">
        <p className="text-sm font-bold text-[var(--sw360-charcoal)]">Start a walk</p>
        <p className="mt-1 text-xs text-[var(--sw360-charcoal)]/60">
          Coming in this build train.
        </p>
      </div>
    </div>
  );
}
