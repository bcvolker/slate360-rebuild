import Link from "next/link";
import { clsx } from "clsx";

interface FooterProps {
  variant?: "dark" | "light";
}

export default function Footer({ variant = "dark" }: FooterProps) {
  const isLight = variant === "light";

  return (
    <footer 
      className={clsx(
        "relative z-10 w-full text-xs py-8 snap-end border-t transition-colors duration-300",
        isLight 
          ? "bg-slate-50 border-slate-200" 
          : "border-slate-800 bg-[#050814]"
      )}
    >
      
      <div className="relative mx-auto flex max-w-7xl items-center justify-between flex-wrap gap-6 px-6 lg:px-8">
        <nav className="flex items-center gap-6 flex-wrap">
          <Link href="/subscribe" className={clsx("text-sm tracking-wide uppercase transition-colors duration-150 underline-offset-4", isLight ? "text-slate-600 hover:text-slate-900 hover:underline" : "text-slate-200 hover:text-white hover:underline")}>Plans & Pricing</Link>
          <Link href="/about" className={clsx("text-sm tracking-wide uppercase transition-colors duration-150 underline-offset-4", isLight ? "text-slate-600 hover:text-slate-900 hover:underline" : "text-slate-200 hover:text-white hover:underline")}>About</Link>
          <Link href="/contact" className={clsx("text-sm tracking-wide uppercase transition-colors duration-150 underline-offset-4", isLight ? "text-slate-600 hover:text-slate-900 hover:underline" : "text-slate-200 hover:text-white hover:underline")}>Contact</Link>
          <div className={clsx("h-3 w-px hidden sm:block", isLight ? "bg-slate-300" : "bg-slate-600")} />
          <Link href="/terms" className={clsx("text-sm tracking-wide uppercase transition-colors duration-150 underline-offset-4", isLight ? "text-slate-600 hover:text-slate-900 hover:underline" : "text-slate-200 hover:text-white hover:underline")}>Terms</Link>
          <Link href="/privacy" className={clsx("text-sm tracking-wide uppercase transition-colors duration-150 underline-offset-4", isLight ? "text-slate-600 hover:text-slate-900 hover:underline" : "text-slate-200 hover:text-white hover:underline")}>Privacy</Link>
          <Link href="/cookies" className={clsx("text-sm tracking-wide uppercase transition-colors duration-150 underline-offset-4", isLight ? "text-slate-600 hover:text-slate-900 hover:underline" : "text-slate-200 hover:text-white hover:underline")}>Cookies</Link>
          <Link href="/security" className={clsx("text-sm tracking-wide uppercase transition-colors duration-150 underline-offset-4", isLight ? "text-slate-600 hover:text-slate-900 hover:underline" : "text-slate-200 hover:text-white hover:underline")}>Security</Link>
        </nav>
        <p className={clsx("font-orbitron", isLight ? "text-slate-400" : "text-slate-500")}>© 2025 Slate360. All rights reserved.</p>
      </div>
    </footer>
  );
}
