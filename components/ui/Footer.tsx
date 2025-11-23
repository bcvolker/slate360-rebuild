import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full text-xs bg-zinc-900/95 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] py-6 lg:snap-start">
      <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6">
        <nav className="flex items-center gap-8">
          <Link href="/about" className="uppercase tracking-wider hover:text-[#A97142] transition-colors text-slate-400">About</Link>
          <Link href="/contact" className="uppercase tracking-wider hover:text-[#A97142] transition-colors text-slate-400">Contact</Link>
          <Link href="/subscribe" className="uppercase tracking-wider hover:text-[#A97142] transition-colors text-slate-400">Subscribe</Link>
          <Link href="/privacy" className="uppercase tracking-wider hover:text-[#A97142] transition-colors text-slate-400">Privacy</Link>
        </nav>
        <p className="text-slate-500">© 2025 Slate360. All rights reserved.</p>
      </div>
    </footer>
  );
}
