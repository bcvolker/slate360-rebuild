import Link from "next/link";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";

const ECOSYSTEM_LINKS = [
  { label: "Site Walk", href: "/product/site-walk" },
  { label: "Digital Twin", href: "/product/digital-twin" },
] as const;

const GOVERNANCE_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Security", href: "/security" },
  { label: "Cookies", href: "/cookies" },
  { label: "Terms", href: "/terms" },
] as const;

export function MarketingFooter() {
  return (
    <footer className="snap-start border-t border-white/[0.05] bg-[#0B0F15] px-6 py-12 lg:px-12">
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-8 text-sm text-[#A3AED0] md:grid-cols-4">
        <div>
          <Slate360Logo variant="dark" />
          <p className="mt-4 leading-relaxed">
            Slate360 is primarily a mobile app ecosystem for iOS and Android. Desktop Studio access is
            provided as a secondary cloud environment.
          </p>
        </div>
        <div>
          <p className="mb-3 font-semibold text-[#FFFFFF]">Ecosystem Tools</p>
          <ul className="space-y-2">
            {ECOSYSTEM_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-[#00E699]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-[#FFFFFF]">Governance Tiers</p>
          <ul className="space-y-2">
            {GOVERNANCE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-[#00E699]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-[#FFFFFF]">Corporate</p>
          <ul className="space-y-2">
            <li>
              <Link href="/contact" className="transition-colors hover:text-[#00E699]">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/contact" className="transition-colors hover:text-[#00E699]">
                Send Feedback
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
