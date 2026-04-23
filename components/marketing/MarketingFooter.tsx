import Link from "next/link";
import { MapPin, Building2, Palette, FileText, Twitter, Linkedin, Github, Mail } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { label: "Site Walk", href: "#apps" },
    { label: "360 Tours", href: "#apps" },
    { label: "Design Studio", href: "#apps" },
    { label: "Content Studio", href: "#apps" },
    { label: "Pricing", href: "#pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "Security", href: "/security" },
  ],
};

const SOCIAL_LINKS = [
  { icon: Twitter, label: "Twitter", href: "https://twitter.com/slate360" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/company/slate360" },
  { icon: Github, label: "GitHub", href: "https://github.com/slate360" },
  { icon: Mail, label: "Email", href: "mailto:hello@slate360.com" },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      {/* Final CTA band */}
      <div className="bg-slate-900 px-6 py-16 text-center">
        <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to modernize your construction workflow?
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-slate-400">
          Start free today. No credit card required. Upgrade when you are ready.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-500"
          >
            Start Free Trial
          </Link>
          <Link
            href="/contact"
            className="rounded-xl border border-white/20 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
          >
            Talk to Sales
          </Link>
        </div>
      </div>

      {/* Footer links */}
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-12 flex flex-col gap-8 lg:flex-row lg:gap-16">
          {/* Brand column */}
          <div className="lg:w-72 lg:flex-shrink-0">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 12L8 4L13 12H3Z" fill="white" />
                </svg>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-slate-900">
                Slate<span className="text-blue-600">360</span>
              </span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              The ultimate app ecosystem for construction teams. Document, visualize, and deliver — all from one
              connected platform.
            </p>
            {/* App icons */}
            <div className="flex gap-2">
              {[
                { Icon: MapPin, label: "Site Walk", color: "bg-blue-100 text-blue-600" },
                { Icon: Building2, label: "360 Tours", color: "bg-indigo-100 text-indigo-600" },
                { Icon: Palette, label: "Design Studio", color: "bg-violet-100 text-violet-600" },
                { Icon: FileText, label: "Content Studio", color: "bg-sky-100 text-sky-600" },
              ].map(({ Icon, label, color }) => (
                <div
                  key={label}
                  title={label}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
            {Object.entries(FOOTER_LINKS).map(([group, links]) => (
              <div key={group}>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">{group}</p>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Slate360. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
