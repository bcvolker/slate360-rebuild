import { SlateLogo } from "@/components/shared/SlateLogo";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { PortalFooter } from "./PortalFooter";

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
  showFooter?: boolean;
  className?: string;
}) {
  const immersive = variant === "immersive";

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-[#0B0F15] text-slate-100",
        immersive ? "h-screen overflow-hidden" : "",
        className,
      )}
    >
      <header
        className={cn(
          "shrink-0 border-b border-white/10 bg-[rgba(21,26,35,0.92)] backdrop-blur-md",
          immersive ? "h-14" : "",
        )}
      >
        <div
          className={cn(
            "mx-auto flex items-center justify-between gap-4 px-4",
            immersive ? "h-14 max-w-none" : "max-w-6xl py-3 sm:px-6",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <SlateLogo size="sm" className="shrink-0" />
            <div className="hidden h-5 w-px bg-white/15 sm:block" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {portalLabel}
              </p>
              {title ? (
                <p className="truncate text-sm font-semibold text-white">{title}</p>
              ) : null}
              {subtitle ? (
                <p className="truncate text-[11px] text-slate-400">{subtitle}</p>
              ) : null}
            </div>
            {orgLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogoUrl}
                alt={orgName ?? "Organization"}
                className="ml-1 hidden h-7 w-7 rounded object-contain bg-white/5 p-0.5 sm:block"
              />
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
          ) : null}
        </div>
      </header>

      <div className={cn("flex flex-1 flex-col", immersive ? "min-h-0 overflow-hidden" : "")}>
        {children}
      </div>

      {showFooter && !immersive ? <PortalFooter orgName={orgName} /> : null}
    </div>
  );
}
