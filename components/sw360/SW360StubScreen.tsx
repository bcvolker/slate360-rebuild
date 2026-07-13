/**
 * Shared "coming in this build train" placeholder for SW360 tab screens not
 * yet built out (B2.0 ships the app/brand/shell; B2.1+ fills these in).
 */
export function SW360StubScreen({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-24 text-center">
      <h1 className="text-lg font-black text-[var(--sw360-charcoal)]">{title}</h1>
      <p className="text-sm text-[var(--sw360-charcoal)]/60">Coming in this build train.</p>
    </div>
  );
}
