import Link from 'next/link';
import Image from 'next/image';

const links = [
  { href: "/about", label: "About" },
  { href: "/subscribe", label: "Subscribe" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Login" },
];

export default function Header() {
  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-md sticky top-0 z-50">
      <nav className="max-w-screen-xl mx-auto flex items-center justify-between h-20 px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Slate360 Home">
          {/* Next.js Image with fallback and debug logging */}
          <Image
            src="/logo.png"
            alt="Slate360 Logo"
            width={120}
            height={40}
            priority
            onError={e => {
              console.error("⚠️ Logo failed to load via Next.js Image, switching to fallback <img>.");
              const target = e.target as HTMLImageElement;
              if (target && typeof target.outerHTML === 'string') {
                target.outerHTML = `<img src='/logo.png' alt='Slate360 Logo' width='120' height='40' style='border:2px solid red;object-fit:contain;display:block;' />`;
              }
            }}
          />
        </Link>
        <ul className="flex items-center gap-8 m-0 p-0 list-none">
          {links.map(l => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-slate-800 hover:text-[#1E3A8A] transition-colors text-lg font-medium px-2 py-1 rounded-md"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}