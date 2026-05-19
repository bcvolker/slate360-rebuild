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
};

export function MobileAppShell({
  header,
  bottomNav,
  sidebar,
  children,
  className,
  bodyClassName,
  mainClassName,
}: MobileAppShellProps) {
  return (
    <div
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
            "flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_32%),#0B0F15]",
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