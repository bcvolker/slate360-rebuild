import { SlateIcon } from "@/components/shared/SlateIcon";
import { cn } from "@/lib/utils";

type HomeBrandMarkProps = {
  iconClassName?: string;
  wordClassName?: string;
  className?: string;
};

/**
 * Light-canvas wordmark for the public homepage path.
 * Icon is the green Slate mark; lettering uses marketing tokens.
 * Do not swap in the reversed amber lockup (uploads/slate360-logo-reversed-v2.svg).
 */
export function HomeBrandMark({ iconClassName, wordClassName, className }: HomeBrandMarkProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <SlateIcon className={cn("w-auto shrink-0", iconClassName ?? "h-10")} aria-hidden />
      <span className={cn("font-semibold tracking-[0.13em]", wordClassName ?? "text-[19px]")} aria-hidden>
        <span className="text-[var(--mkt-ink)]">SLATE</span>
        <span className="text-[var(--mkt-brand-green)]">360</span>
      </span>
    </span>
  );
}
