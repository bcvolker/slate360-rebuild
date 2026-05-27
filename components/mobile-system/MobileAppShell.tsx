import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MobileAppShellProps = {
  header?: ReactNode;
  bottomNav?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  mainClassName?: string;
  /** Real-route verification marker for /app or module shell content */
  mobileRoute?: "app" | "site-walk" | "digital-twin";
};

export function MobileAppShell({
  header,
  bottomNav,
  sidebar,
  children,
  className,
  bodyClassName,
  mainClassName,
  mobileRoute,
}: MobileAppShellProps) {
  return (
    <div
      data-mobile-shell-version="layout-v4"
      data-mobile-route={mobileRoute}
      className={cn(
        "dark flex h-[100dvh] w-full max-w-full overflow-hidden bg-[#0B0F15] text-slate-50",
        className,
      )}
    >
      {sidebar}
      <div className={cn("flex min-w-0 flex-1 flex-col overflow-hidden", bodyClassName)}>
        {header}
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0B0F15]",
            mainClassName,
          )}
        >
          {children}
        </main>
        {bottomNav}
      </div>
    </div>
  );
}