import Link from "next/link";
import { SlateIcon } from "@/components/shared/SlateIcon";
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
          <Link href="/" aria-label="Slate360 home" className="inline-flex items-center gap-2">
            <SlateIcon className="h-[30px] w-auto" />
            <span className="text-[15.5px] font-semibold tracking-[0.13em]">
              <span className="text-[var(--mkt-ink)]">SLATE</span>
              <span className="text-[var(--graphite-primary)]">360</span>
            </span>
          </Link>
          <p className="mt-3.5 max-w-[64ch] text-xs leading-[1.8] text-[var(--mkt-ink-muted)]">
            Reality-capture and technical documentation services for the building industry, serving
            the Greater Phoenix area. Measurement tools in the viewer are for general reference, not
            a formal survey.
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
