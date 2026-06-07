import Link from "next/link";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { MKT_CONTAINER, MKT_SECTION } from "@/app/(public)/_components/marketing-styles";

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
] as const;

export function MarketingFooter() {
  return (
    <footer className={`${MKT_SECTION} border-t border-white/[0.06] pb-12 pt-16`}>
      <div className={MKT_CONTAINER}>
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr]">
          <div>
            <Slate360Logo variant="dark" />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--graphite-muted)]">
              Slate360 is a mobile-first platform for construction field documentation and spatial reality
              capture. Site Walk and Twin 360 share one project portfolio.
            </p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-[var(--graphite-text-header)]">Company</p>
            <ul className="space-y-2 text-sm text-[var(--graphite-muted)]">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-[var(--graphite-text-body)]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-[var(--graphite-muted)] md:text-left">
          © {new Date().getFullYear()} Slate360. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
