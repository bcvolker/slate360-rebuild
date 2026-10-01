import Link from "next/link";
import { HomeBrandMark } from "@/components/marketing/HomeBrandMark";
import { MKT_L_CONTAINER } from "@/app/(public)/_components/marketing-styles-light";

const FOOTER_LINKS = [
  { label: "Login", href: "/login" },
  { label: "Contact", href: "/#request-a-visit" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
] as const;

/**
 * Homepage footer — light marketing system. No app names, no app-store
 * badges (see docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md §4.5): the portal
 * is described purely as something opened in a browser.
 */
export function HomeFooterLight() {
  return (
    <footer className="border-t border-[var(--mkt-line)] bg-[var(--mkt-canvas-deep)] pb-14 pt-10">
      <div className={`${MKT_L_CONTAINER} flex flex-wrap items-start justify-between gap-6`}>
        <div className="max-w-md">
          <Link href="/" aria-label="Slate360 home" className="inline-flex items-center">
            <HomeBrandMark iconClassName="h-[30px]" wordClassName="text-[15.5px]" />
          </Link>
          <p className="mt-3.5 max-w-[64ch] text-xs leading-[1.8] text-[var(--mkt-ink-muted)]">
            Field documentation and project workflow for contractors in the East Valley, Phoenix.
            Measurement tools in the viewer are for general reference. A licensed survey is the
            record when a dimension has to stand on its own.
          </p>
          <p className="mt-3 text-xs text-[var(--mkt-ink-muted)]">© {new Date().getFullYear()} Slate360 LLC.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-[13.5px] text-[var(--mkt-ink-muted)] transition-colors hover:text-[var(--mkt-ink)]">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
