import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MobileShell } from "./MobileShell";

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

/** @deprecated Prefer MobileShell — kept for module sub-route shells. */
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
    <MobileShell
      className={className}
      mobileRoute={mobileRoute}
      header={header}
      bottomNav={bottomNav}
      sidebar={sidebar}
      scroll={
        <div
          className={cn(
            "flex min-h-0 flex-col",
            mainClassName,
            bodyClassName,
          )}
        >
          {children}
        </div>
      }
    />
  );
}
