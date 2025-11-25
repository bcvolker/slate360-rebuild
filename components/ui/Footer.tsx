import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 w-full text-xs py-6 snap-end bg-metallic-footer slate360-footer">
      <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6">
        <nav className="flex items-center gap-6 flex-wrap text-white">
          <Link href="/subscribe" className="uppercase tracking-wider font-orbitron hover:text-[#4F89D4] transition-colors">Plans & Pricing</Link>
          <Link href="/about" className="uppercase tracking-wider font-orbitron hover:text-[#4F89D4] transition-colors">About</Link>
          <Link href="/contact" className="uppercase tracking-wider font-orbitron hover:text-[#4F89D4] transition-colors">Contact</Link>
          <div className="h-3 w-px bg-slate-400/40 hidden sm:block" />
          <Link href="/terms" className="uppercase tracking-wider font-orbitron hover:text-[#4F89D4] transition-colors">Terms</Link>
          <Link href="/privacy" className="uppercase tracking-wider font-orbitron hover:text-[#4F89D4] transition-colors">Privacy</Link>
          <Link href="/cookies" className="uppercase tracking-wider font-orbitron hover:text-[#4F89D4] transition-colors">Cookies</Link>
          <Link href="/security" className="uppercase tracking-wider font-orbitron hover:text-[#4F89D4] transition-colors">Security</Link>
        </nav>
        <p className="text-slate-400 font-orbitron">© 2025 Slate360. All rights reserved.</p>
      </div>
    </footer>
  );
}
