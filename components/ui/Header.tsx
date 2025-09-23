"use client";
import Link from 'next/link';
import { usePathname } from "next/navigation";

const links = [
  { href: "/about", label: "About" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Login" },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
      <nav className="mx-auto max-w-7xl flex items-center justify-between h-16 px-6">
        <Link href="/" aria-label="Go to Homepage" className="flex items-center gap-3">
          <img
            src="/content-screenshot.png"
            alt="Slate360 Logo"
            style={{ height: '48px', width: 'auto', objectFit: 'contain', display: 'block', border: '2px solid red', background: 'yellow' }}
          />
        </Link>
        <ul className="flex items-center gap-8">
          {links.map(l => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`text-lg font-medium text-[var(--ink)] hover:text-[var(--brand-blue)] relative px-2 py-1 transition-colors duration-150
                    after:absolute after:-bottom-1 after:left-0 after:h-[2px]
                    after:w-0 hover:after:w-full after:bg-[var(--brand-blue)]
                    after:transition-all ${active ? 'text-[var(--brand-blue)] font-semibold' : ''}`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}