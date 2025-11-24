import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full text-xs slate360-footer py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6">
        <nav className="flex items-center gap-6 flex-wrap">
          <Link href="/subscribe" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-400 font-orbitron">Plans & Pricing</Link>
          <Link href="/about" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-400 font-orbitron">About</Link>
          <Link href="/contact" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-400 font-orbitron">Contact</Link>
          <div className="h-3 w-px bg-white/20 hidden sm:block" />
          <Link href="/terms" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-400 font-orbitron">Terms</Link>
          <Link href="/privacy" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-400 font-orbitron">Privacy</Link>
          <Link href="/cookies" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-400 font-orbitron">Cookies</Link>
          <Link href="/security" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-400 font-orbitron">Security</Link>
        </nav>
        <p className="text-slate-500 font-orbitron">© 2025 Slate360. All rights reserved.</p>
      </div>
    </footer>
  );
}
