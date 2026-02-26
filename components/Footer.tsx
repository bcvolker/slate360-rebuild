"use client";
import Link from "next/link";

const features = [
  { label: "Design Studio", href: "/features/design-studio" },
  { label: "Project Hub", href: "/project-hub" },
  { label: "Content Studio", href: "/features/content-studio" },
  { label: "360 Tour Builder", href: "/features/360-tour-builder" },
  { label: "Geospatial & Robotics", href: "/features/geospatial-robotics" },
  { label: "Virtual Studio", href: "/features/virtual-studio" },
  { label: "Analytics & Reports", href: "/features/analytics-reports" },
  { label: "SlateDrop", href: "/features/slatedrop" },
];

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="col-span-1">
          <Link href="/" className="inline-block mb-4">
            <img src="/logo.svg" alt="Slate360" className="h-8 w-auto" />
          </Link>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
            The all-in-one construction platform for teams who build.
          </p>
        </div>

        {/* Features */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Platform</p>
          <ul className="space-y-2.5">
            {features.map((f) => (
              <li key={f.href}>
                <Link href={f.href} className="text-sm text-gray-600 hover:text-[#FF4D00] transition-colors">
                  {f.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Company</p>
          <ul className="space-y-2.5">
            {[
              { label: "About", href: "/about" },
              { label: "Pricing", href: "/plans" },
              { label: "Sign in", href: "/login" },
              { label: "Start free trial", href: "/signup" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-gray-600 hover:text-[#FF4D00] transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Legal</p>
          <ul className="space-y-2.5">
            {[
              { label: "Privacy Policy", href: "#" },
              { label: "Terms of Service", href: "#" },
              { label: "Security", href: "#" },
            ].map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-sm text-gray-600 hover:text-[#FF4D00] transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Slate360. All rights reserved.</p>
          <p className="text-xs text-gray-400">Built for construction professionals.</p>
        </div>
      </div>
    </footer>
  );
}
