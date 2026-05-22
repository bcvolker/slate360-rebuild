import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PortalPrimaryCta({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "btn-amber-solid inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#0C0A09] disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PortalPrimaryLink({
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return (
    <a
      className={cn(
        "btn-amber-solid inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-[#0C0A09]",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

export function PortalSecondaryCta({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "btn-teal-outline inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PortalSecondaryLink({
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return (
    <a
      className={cn(
        "btn-teal-outline inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
