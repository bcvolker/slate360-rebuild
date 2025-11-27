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
          : "border-slate-800 bg-slate-950"
      )}
    >
      
      <div className="relative mx-auto flex max-w-7xl items-center justify-between flex-wrap gap-6 px-6 lg:px-8">
        <nav className="flex items-center gap-6 flex-wrap">
          {["Plans & Pricing", "About", "Contact", "Terms", "Privacy", "Cookies", "Security"].map((label, i) => {
             const href = label === "Plans & Pricing" ? "/subscribe" : `/${label.toLowerCase().replace(/ & /g, "-")}`;
             return (
                <Link 
                  key={label}
                  href={href} 
                  className={clsx(
                    "text-sm tracking-wide uppercase transition-colors duration-150 underline-offset-4 font-bold", 
                    isLight 
                      ? "text-blue-600 hover:text-[#B87333] hover:underline" 
                      : "text-blue-600 hover:text-[#B87333] hover:underline"
                  )}
                >
                  {label}
                </Link>
             );
          })}
        </nav>
        <p className={clsx("font-orbitron", isLight ? "text-slate-400" : "text-slate-500")}>© 2025 Slate360. All rights reserved.</p>
      </div>
    </footer>
  );
}
