


import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full p-4 bg-slate-800 border-t border-slate-700 text-center text-xs">
      <nav className="mb-2 flex flex-wrap justify-center gap-4 text-xs">
        <Link href="/about" className="hover:text-white transition-colors duration-200">About</Link>
        <Link href="/contact" className="hover:text-white transition-colors duration-200">Contact</Link>
        <Link href="/subscribe" className="hover:text-white transition-colors duration-200">Subscribe</Link>
        <Link href="/login" className="hover:text-white transition-colors duration-200">Login</Link>
        <Link href="/terms" className="hover:text-white transition-colors duration-200">Terms</Link>
        <Link href="/privacy" className="hover:text-white transition-colors duration-200">Privacy</Link>
        <Link href="/cookies" className="hover:text-white transition-colors duration-200">Cookies</Link>
        <Link href="/pricing" className="hover:text-white transition-colors duration-200">Pricing</Link>
      </nav>
      <p className="text-slate-200">&copy; {new Date().getFullYear()} Slate360. All Rights Reserved.</p>
    </footer>
  );
}
