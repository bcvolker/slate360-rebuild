import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full text-xs bg-white/90 backdrop-blur-md border-t border-brand-blue/20 shadow-[0_-4px_20px_rgba(79,137,212,0.12)] py-6 snap-start">
      <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6">
        <nav className="flex items-center gap-8">
          <Link href="/about" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-600 font-orbitron">About</Link>
          <Link href="/contact" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-600 font-orbitron">Contact</Link>
          <Link href="/subscribe" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-600 font-orbitron">Subscribe</Link>
          <Link href="/privacy" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-slate-600 font-orbitron">Privacy</Link>
        </nav>
        <p className="text-slate-600 font-orbitron">© 2025 Slate360. All rights reserved.</p>
      </div>
    </footer>
  );
}
