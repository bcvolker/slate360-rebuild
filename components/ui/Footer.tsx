import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 w-full text-xs bg-[color:var(--slate360-charcoal)] text-slate-200 border-t border-[color:var(--slate360-grey)]/40 shadow-[0_-6px_30px_rgba(0,0,0,0.7)] py-8 lg:snap-end">
      <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6">
        <nav className="flex items-center gap-6 flex-wrap">
          <Link href="/subscribe" className="uppercase tracking-wider text-slate-300 hover:text-[color:var(--slate360-blue)] transition-colors font-orbitron">Plans & Pricing</Link>
          <Link href="/about" className="uppercase tracking-wider text-slate-300 hover:text-[color:var(--slate360-blue)] transition-colors font-orbitron">About</Link>
          <Link href="/contact" className="uppercase tracking-wider text-slate-300 hover:text-[color:var(--slate360-blue)] transition-colors font-orbitron">Contact</Link>
          <div className="h-3 w-px bg-white/20 hidden sm:block" />
          <Link href="/terms" className="uppercase tracking-wider text-slate-300 hover:text-[color:var(--slate360-blue)] transition-colors font-orbitron">Terms</Link>
          <Link href="/privacy" className="uppercase tracking-wider text-slate-300 hover:text-[color:var(--slate360-blue)] transition-colors font-orbitron">Privacy</Link>
          <Link href="/cookies" className="uppercase tracking-wider text-slate-300 hover:text-[color:var(--slate360-blue)] transition-colors font-orbitron">Cookies</Link>
          <Link href="/security" className="uppercase tracking-wider text-slate-300 hover:text-[color:var(--slate360-blue)] transition-colors font-orbitron">Security</Link>
        </nav>
        <p className="text-slate-400 font-orbitron">© 2025 Slate360. All rights reserved.</p>
      </div>
    </footer>
  );
}
