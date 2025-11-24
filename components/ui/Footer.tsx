import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full text-xs bg-brand-grey/95 backdrop-blur-md border-t border-brand-light-grey/20 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] py-6 snap-start">
      <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6">
        <nav className="flex items-center gap-8">
          <Link href="/about" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-brand-light-grey font-orbitron">About</Link>
          <Link href="/contact" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-brand-light-grey font-orbitron">Contact</Link>
          <Link href="/subscribe" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-brand-light-grey font-orbitron">Subscribe</Link>
          <Link href="/privacy" className="uppercase tracking-wider hover:text-brand-copper transition-colors text-brand-light-grey font-orbitron">Privacy</Link>
        </nav>
        <p className="text-brand-light-grey font-orbitron">© 2025 Slate360. All rights reserved.</p>
      </div>
    </footer>
  );
}
