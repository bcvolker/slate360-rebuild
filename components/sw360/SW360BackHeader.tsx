import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Back-navigation for non-tab drill-down pages (project detail, and future
 * screens reached by tapping INTO something rather than a bottom-nav tab).
 * There's no browser back button inside a Capacitor WebView and no OS back
 * gesture guarantee, so every such screen needs one of these.
 */
export function SW360BackHeader({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="-ml-1 flex w-fit items-center gap-1 py-1 text-sm font-bold text-[var(--sw360-charcoal)]/70"
    >
      <ChevronLeft size={18} />
      {label}
    </Link>
  );
}
