import { cn } from "@/lib/utils";

const S_EMBLEM_UPPER =
  "M18.89,42.86l54.37-30.34c1.36-.92,2.99-1.45,4.72-1.45,1.59,0,3.1.44,4.39,1.23l58.74,32.78v19.27s-63.1-35.21-63.1-35.21l-41.73,23.28c-.16.09-.57.32-.57.97s.42.89.57.97l61.53,34.34-17.21,9.66L18.89,63.93v-21.07Z";

const S_EMBLEM_LOWER =
  "M80.23,43.82l-17.16,9.69,60.64,34.72c.16.09.57.32.57.97s-.42.89-.57.97l-38.47,21.48-3.26,1.82-3.26-1.82-59.83-33.4v19.27s58.99,32.94,58.99,32.94c1.27.71,2.69,1.07,4.1,1.07s2.83-.36,4.1-1.07l55.02-30.72v-20.91l-60.88-35.01Z";

const SYMBOL_CLASS = "h-8 w-auto block shrink-0 text-[#00E699] font-sans";

const WORDMARK_CLASS =
  "font-sans font-bold tracking-[0.14em] text-2xl text-white select-none ml-4";

const WORDMARK_LIGHT_CLASS =
  "font-sans font-bold tracking-[0.14em] text-2xl text-slate-900 select-none ml-4";

type Slate360LogoProps = {
  variant?: "dark" | "light";
  className?: string;
  showWordmark?: boolean;
};

export function Slate360Logo({
  variant = "dark",
  className,
  showWordmark = true,
}: Slate360LogoProps) {
  const wordmarkClass = variant === "light" ? WORDMARK_LIGHT_CLASS : WORDMARK_CLASS;

  return (
    <div className={cn("inline-flex items-center shrink-0", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 142.6 142.6"
        role="img"
        aria-hidden={showWordmark}
        aria-label={showWordmark ? undefined : "Slate360"}
        className={SYMBOL_CLASS}
      >
        <defs>
          <linearGradient id="slate360-emblem-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00E699" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
        </defs>
        <path fill="url(#slate360-emblem-gradient)" d={S_EMBLEM_UPPER} />
        <path fill="url(#slate360-emblem-gradient)" d={S_EMBLEM_LOWER} />
      </svg>
      {showWordmark ? <span className={wordmarkClass}>SLATE360</span> : null}
    </div>
  );
}

export function Slate360EmblemIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 142.6 142.6"
      role="img"
      aria-label="Slate360"
      className={cn("h-8 w-8 block shrink-0", className)}
    >
      <defs>
        <linearGradient id="slate360-favicon-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00E699" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>
      <rect width="142.6" height="142.6" rx="12" fill="#0B0F15" />
      <path fill="url(#slate360-favicon-gradient)" d={S_EMBLEM_UPPER} />
      <path fill="url(#slate360-favicon-gradient)" d={S_EMBLEM_LOWER} />
    </svg>
  );
}
