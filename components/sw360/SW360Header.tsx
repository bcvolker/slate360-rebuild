import Link from "next/link";

/**
 * SW360 top header — wordmark + account entry point only. No app switcher, no
 * Slate360 branding, no marketing chrome (per the "visible pivot" bar).
 */
export function SW360Header() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/95 px-4 backdrop-blur-sm">
      <Link href="/sw360" className="text-sm font-black tracking-tight text-[var(--sw360-charcoal)]">
        SITE WALK <span className="text-[var(--sw360-green-light)]">360</span>
      </Link>
      <Link
        href="/sw360/account"
        aria-label="Account"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-bold text-[var(--sw360-charcoal)]"
      >
        SW
      </Link>
    </header>
  );
}
