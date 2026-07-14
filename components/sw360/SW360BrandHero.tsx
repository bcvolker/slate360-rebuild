/**
 * Home's opening greeting. The big "SITE WALK 360" wordmark now lives in the
 * header (made legible per on-device feedback), so repeating it again here
 * would be redundant — this is just the greeting line, freeing vertical
 * space for real content (recent walks, projects) instead of decoration.
 */
export function SW360BrandHero({ greeting }: { greeting: string }) {
  return (
    <p className="text-xl font-black tracking-tight text-[var(--sw360-charcoal)]">{greeting}</p>
  );
}
