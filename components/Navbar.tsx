"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/about", label: "About" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Login" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 border-b border-slate-200/70">
      <nav className="mx-auto max-w-7xl flex items-center justify-between h-12 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-[var(--ink)]">
          <span className="h-5 w-5 rounded-t rotate-45 border-2 border-[var(--brand-blue)]" />
          <span>SLATE360</span>
        </Link>
        <ul className="flex items-center gap-4">
          {links.map(l => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`text-sm text-[var(--ink)]/85 hover:text-[var(--ink)] relative
                    after:absolute after:-bottom-1 after:left-0 after:h-[2px]
                    after:w-0 hover:after:w-full after:bg-[var(--brand-blue)]
                    after:transition-all`}
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
