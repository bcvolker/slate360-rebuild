import Link from "next/link";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { NAV_LINK } from "@/components/marketing-launchpad/marketing-styles";

const NAV_ITEMS = [
  { label: "Product", href: "#site-walk-section-start" },
  { label: "Pricing", href: "#pricing-matrix-section" },
  { label: "Sign In", href: "/login" },
] as const;

export function MarketingHeader() {
  return (
    <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/[0.05] bg-[#0B0F15]/80 px-6 backdrop-blur-xl lg:px-12">
      <Link href="/" aria-label="Slate360 home">
        <Slate360Logo variant="dark" className="text-lg" />
      </Link>
      <nav className="flex items-center gap-8">
        {NAV_ITEMS.map((item) => (
          <Link key={item.label} href={item.href} className={NAV_LINK}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
