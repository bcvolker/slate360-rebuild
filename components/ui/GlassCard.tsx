import { clsx } from "clsx";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "deep" | "graphite";
}

export default function GlassCard({ children, className, variant = "graphite" }: GlassCardProps) {
  const baseStyles = "relative rounded-[32px] backdrop-blur-xl border flex flex-col overflow-hidden transition-all duration-500 h-auto w-full";

  const variantStyles =
    variant === "deep"
      ? "bg-slate-900/80 border-t-white/20 border-l-white/20 border-b-black/30 border-r-black/30 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]"
      : "bg-white/70 border-t-white/80 border-l-white/80 border-b-slate-300 border-r-slate-300 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)]";

  return (
    <div className={clsx(baseStyles, variantStyles, className)}>
      {children}
    </div>
  );
}
