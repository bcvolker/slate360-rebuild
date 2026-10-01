import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { PortalBrandMark } from "./PortalBrandMark";
import { PortalFooter } from "./PortalFooter";

/**
 * Light frame for every client share surface outside /portal/[token] (deliverable
 * links, file shares, uploads, respond links, the 3D Scan viewer). Same palette and
 * wordmark as the portal and slate360.ai (theme B). `accent` is kept for callers;
 * every share surface now uses the one portal accent.
 */
export function ExternalPortalShell({
  children,
  portalLabel = "Secure sharing",
  title,
  subtitle,
  orgName,
  orgLogoUrl,
  headerActions,
  variant = "default",
  showFooter = true,
  className,
}: {
  children: ReactNode;
  portalLabel?: string;
  title?: string;
  subtitle?: string;
  orgName?: string;
  orgLogoUrl?: string | null;
  headerActions?: ReactNode;
  variant?: "default" | "immersive";
  accent?: "default" | "twin";
  showFooter?: boolean;
  className?: string;
}) {
  const immersive = variant === "immersive";
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-[var(--portal-canvas)] text-[var(--portal-ink)]",
        immersive ? "h-[100dvh] overflow-hidden" : "",
        className,
      )}
      data-portal-theme="light"
    >
      <header className={cn("shrink-0 border-b border-[var(--portal-line)] bg-[var(--portal-surface)]", immersive ? "h-14" : "")}>
        <div className={cn("mx-auto flex items-center justify-between gap-4 px-4", immersive ? "h-14 max-w-none" : "max-w-[1120px] flex-wrap gap-y-2 py-3 sm:px-6")}>
          <div className="flex min-w-0 items-center gap-3">
            <PortalBrandMark logoUrl={orgLogoUrl} name={orgName} />
            <div className="hidden h-6 w-px bg-[var(--portal-line)] sm:block" aria-hidden />
            <div className="min-w-0">
              <p className={cn("truncate text-xs font-semibold uppercase tracking-[0.07em] text-[var(--portal-ink-muted)]", subtitle ? "hidden sm:block" : "")}>{portalLabel}</p>
              {title ? <p className="truncate text-sm font-semibold text-[var(--portal-ink)]">{title}</p> : null}
              {subtitle ? <p className="truncate text-xs text-[var(--portal-ink-muted)]">{subtitle}</p> : null}
            </div>
          </div>
          {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
        </div>
      </header>
      <div className={cn("flex flex-1 flex-col", immersive ? "min-h-0 overflow-hidden" : "")}>{children}</div>
      {showFooter && !immersive ? <PortalFooter orgName={orgName} /> : null}
    </div>
  );
}
