import { cn } from "@/lib/utils";
import { SlateIcon } from "@/components/shared/SlateIcon";

const LOGO_SIZES = {
  default: {
    symbol: "h-8 w-auto block shrink-0",
    wordmarkDark: "font-sans font-bold tracking-[0.14em] text-2xl select-none ml-4",
    wordmarkLight: "font-sans font-bold tracking-[0.14em] text-2xl select-none ml-4",
  },
  header: {
    symbol: "h-8 w-auto block shrink-0",
    wordmarkDark: "font-sans font-bold tracking-[0.14em] text-lg select-none ml-2.5",
    wordmarkLight: "font-sans font-bold tracking-[0.14em] text-lg select-none ml-2.5",
  },
} as const;

type Slate360LogoProps = {
  variant?: "dark" | "light";
  /** Compact sizing for mobile shell header (h-14 bar). */
  size?: keyof typeof LOGO_SIZES;
  className?: string;
  showWordmark?: boolean;
};

export function Slate360Logo({
  variant = "dark",
  size = "default",
  className,
  showWordmark = true,
}: Slate360LogoProps) {
  const scale = LOGO_SIZES[size];
  const wordmarkClass = variant === "light" ? scale.wordmarkLight : scale.wordmarkDark;
  const slateTextClass = variant === "light" ? "text-slate-900" : "text-white";

  return (
    <div className={cn("inline-flex min-w-0 items-center shrink-0", className)}>
      <SlateIcon className={scale.symbol} aria-hidden={showWordmark} />
      {showWordmark ? (
        <span className={wordmarkClass}>
          <span className={slateTextClass}>SLATE</span>
          <span className="bg-gradient-to-r from-[#00E699] to-[#3B82F6] bg-clip-text text-transparent">
            360
          </span>
        </span>
      ) : null}
    </div>
  );
}

/** Icon-only mark — same raster as PWA install icon. */
export function Slate360EmblemIcon({ className }: { className?: string }) {
  return <SlateIcon className={cn("h-8 w-8", className)} />;
}
