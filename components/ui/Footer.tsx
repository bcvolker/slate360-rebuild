import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 w-full text-xs py-8 snap-end bg-[#F0F4F8] border-t border-[#4F89D4]/20 shadow-[0_-12px_40px_rgba(79,137,212,0.08)] slate360-footer">
      <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6">
        <nav className="flex items-center gap-6 flex-wrap">
          <Link href="/subscribe" className="uppercase tracking-wider font-orbitron">Plans & Pricing</Link>
          <Link href="/about" className="uppercase tracking-wider font-orbitron">About</Link>
          <Link href="/contact" className="uppercase tracking-wider font-orbitron">Contact</Link>
          <div className="h-3 w-px bg-slate-400/20 hidden sm:block" />
          <Link href="/terms" className="uppercase tracking-wider font-orbitron">Terms</Link>
          <Link href="/privacy" className="uppercase tracking-wider font-orbitron">Privacy</Link>
          <Link href="/cookies" className="uppercase tracking-wider font-orbitron">Cookies</Link>
          <Link href="/security" className="uppercase tracking-wider font-orbitron">Security</Link>
        </nav>
        <p className="text-slate-500 font-orbitron">© 2025 Slate360. All rights reserved.</p>
      </div>
    </footer>
  );
}
