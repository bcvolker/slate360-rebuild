import Link from "next/link";
import { Slate360Logo } from "@/components/studio-ui/LogoProvider";
import { NAV_LINK } from "@/components/marketing-launchpad/marketing-styles";

type ProductPageShellProps = {
  title: string;
  children: React.ReactNode;
};

export function ProductPageShell({ title, children }: ProductPageShellProps) {
  return (
    <div className="min-h-screen bg-[#0B0F15]">
      <header className="flex h-20 items-center justify-between border-b border-white/[0.05] bg-[#0B0F15]/80 px-6 backdrop-blur-xl lg:px-12">
        <Link href="/" aria-label="Slate360 home">
          <Slate360Logo variant="dark" className="text-lg" />
        </Link>
        <nav className="flex items-center gap-8">
          <Link href="/#site-walk-section-start" className={NAV_LINK}>
            Product
          </Link>
          <Link href="/#pricing-matrix-section" className={NAV_LINK}>
            Pricing
          </Link>
          <Link href="/login" className={NAV_LINK}>
            Sign In
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-16 lg:px-12">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#00E699]">Slate360 Product</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#FFFFFF]">{title}</h1>
        <div className="mt-10 space-y-8">{children}</div>
        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/signup"
            className="rounded-xl bg-[#00E699] px-6 py-3 text-sm font-semibold text-[#0B0F15] transition-all hover:bg-[#00CC88] active:scale-[0.99]"
          >
            Request Access
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-white/[0.08] px-6 py-3 text-sm font-semibold text-[#F8FAFC] transition-all hover:border-[#00E699]/40"
          >
            Contact Sales
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-white/[0.08] px-6 py-3 text-sm font-semibold text-[#F8FAFC] transition-all hover:border-[#00E699]/40"
          >
            Back to homepage
          </Link>
        </div>
      </main>
    </div>
  );
}
