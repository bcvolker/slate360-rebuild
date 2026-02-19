import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 py-16 px-6 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.svg"
                alt="SLATE360"
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="mt-4 text-white/50 text-sm leading-relaxed">
              The all-in-one sports media platform for teams, venues, and
              creators who demand professional-grade results.
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Features
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Design Studio", href: "/features/design-studio" },
                { label: "Project Hub", href: "/features/project-hub" },
                { label: "SlateDrop", href: "/features/slatedrop" },
                { label: "360° Capture", href: "/features/360-capture" },
                { label: "Analytics", href: "/features/analytics" },
                { label: "GPU Rendering", href: "/features/rendering" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Platform
            </h4>
            <ul className="space-y-3">
              {[
                { label: "All Features", href: "/features" },
                { label: "Plans & Pricing", href: "/plans" },
                { label: "About", href: "/about" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">
              Account
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Login", href: "/login" },
                { label: "Start Free Trial", href: "/plans" },
                { label: "Contact Sales", href: "mailto:hello@slate360.ai" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} SLATE360. All rights reserved.
          </p>
          <p className="text-xs text-white/30">
            Built for the teams that move fast.
          </p>
        </div>
      </div>
    </footer>
  );
}
