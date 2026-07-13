import Link from "next/link";
import { SAFE_AREA_INSET_TOP } from "@/lib/capacitor/safe-area-inset";

/**
 * SW360 top header — kept minimal and low, well clear of the iPhone's own
 * status bar/notch/Dynamic Island. `paddingTop: SAFE_AREA_INSET_TOP` is the
 * proven pattern already used by MobilePlatformHeader.tsx (same reason it's
 * used there: the WebView renders under the native status bar since Capacitor
 * StatusBar.overlaysWebView is true). The 52px content row height below the
 * safe-area padding matches mobileTokens' mobileHeaderBar — the codebase
 * already learned that a taller/bigger app-name treatment fighting for space
 * in this strip doesn't work; the real wordmark now lives in the Home screen's
 * brand hero instead (components/sw360/SW360BrandHero.tsx), not squeezed in
 * here next to the clock.
 */
export function SW360Header() {
  return (
    <header
      className="flex min-h-[3.25rem] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/95 px-3 backdrop-blur-sm"
      style={{ paddingTop: SAFE_AREA_INSET_TOP }}
    >
      <Link href="/sw360" className="text-xs font-black tracking-tight text-[var(--sw360-charcoal)]">
        SW <span className="text-[var(--sw360-green-light)]">360</span>
      </Link>
      <Link
        href="/sw360/account"
        aria-label="Account"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-xs font-bold text-[var(--sw360-charcoal)]"
      >
        SW
      </Link>
    </header>
  );
}
