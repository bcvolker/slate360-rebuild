import Link from "next/link";
import { SAFE_AREA_INSET_TOP } from "@/lib/capacitor/safe-area-inset";

/**
 * SW360 top header. Bar height stays fixed (52px content row + safe-area-top
 * padding — do not grow it; the codebase already learned that a taller header
 * fighting the notch/Dynamic Island for space doesn't work). Wordmark bumped
 * to 17px (from 15px, from the original 12px) — still comfortably inside the
 * unchanged row height, just easier to read at a glance per Brian's repeated
 * "still too small" feedback. Account avatar shows the user's real initials,
 * not a hardcoded "SW".
 */
export function SW360Header({ initials }: { initials: string }) {
  return (
    <header
      className="flex min-h-[3.25rem] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/95 px-3 backdrop-blur-sm"
      style={{ paddingTop: SAFE_AREA_INSET_TOP }}
    >
      <Link href="/sw360" className="text-[17px] font-black leading-none tracking-tight text-[var(--sw360-charcoal)]">
        SITE WALK <span className="text-[var(--sw360-green-light)]">360</span>
      </Link>
      <Link
        href="/sw360/account"
        aria-label="Account"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sw360-green-light)] text-xs font-bold text-white"
      >
        {initials}
      </Link>
    </header>
  );
}
