import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const primary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--portal-accent)] px-5 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] focus-visible:ring-offset-2 disabled:opacity-50";
const secondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--portal-line)] bg-[var(--portal-surface)] px-5 text-sm font-semibold text-[var(--portal-ink)] transition-colors hover:border-[var(--portal-accent-line)] disabled:opacity-50";

export function PortalPrimaryCta({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={cn(primary, className)} {...props}>
      {children}
    </button>
  );
}

export function PortalPrimaryLink({ children, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return (
    <a className={cn(primary, className)} {...props}>
      {children}
    </a>
  );
}

export function PortalSecondaryCta({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={cn(secondary, className)} {...props}>
      {children}
    </button>
  );
}

export function PortalSecondaryLink({ children, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return (
    <a className={cn(secondary, className)} {...props}>
      {children}
    </a>
  );
}
