/**
 * The big, confident "SITE WALK 360" brand treatment lives HERE — not
 * squeezed into the top header strip (which stays low and minimal so it
 * never fights the iPhone's own status bar/notch). Doubles as Home's opening
 * content block so the screen doesn't read as empty before real data loads.
 */
export function SW360BrandHero({ greeting }: { greeting: string }) {
  return (
    <div className="flex flex-col gap-1 pb-1">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--sw360-charcoal)]/50">
        {greeting}
      </p>
      <h1 className="text-[28px] font-black leading-none tracking-tight text-[var(--sw360-charcoal)]">
        SITE WALK <span className="text-[var(--sw360-green-light)]">360</span>
      </h1>
    </div>
  );
}
