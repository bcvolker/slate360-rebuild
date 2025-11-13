import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:px-8">
        <p className="order-2 sm:order-1">
          © {year} Slate360. All rights reserved.
        </p>
        <nav className="order-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:order-2">
          <Link href="/subscribe" className="hover:text-sky-300">
            Subscribe
          </Link>
          <Link href="/about" className="hover:text-sky-300">
            About
          </Link>
          <Link href="/contact" className="hover:text-sky-300">
            Contact
          </Link>
          <Link href="/terms" className="hover:text-sky-300">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-sky-300">
            Privacy
          </Link>
          <Link href="/cookies" className="hover:text-sky-300">
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
