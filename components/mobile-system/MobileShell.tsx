"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileShellDockContextValue = {
  setDock: (node: ReactNode | null) => void;
};

const MobileShellDockContext = createContext<MobileShellDockContextValue | null>(
  null,
);

/** Register activity dock content from a home surface rendered inside MobileShell. */
export function useMobileShellDock(dock: ReactNode | null) {
  const ctx = useContext(MobileShellDockContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setDock(dock);
    return () => ctx.setDock(null);
  }, [ctx, dock]);
}

type MobileShellProps = {
  header?: ReactNode;
  bottomNav?: ReactNode;
  sidebar?: ReactNode;
  /** Explicit dock slot — prefer useMobileShellDock from home surfaces */
  dock?: ReactNode;
  scroll?: ReactNode;
  children?: ReactNode;
  className?: string;
  mobileRoute?: "app" | "site-walk" | "digital-twin";
};

/**
 * Authoritative mobile layout primitive for /app, /site-walk, and /digital-twin.
 *
 * Outer: flex column 100dvh
 * Middle: flex-1 min-h-0 — scroll (flex-1 overflow-y-auto) + dock (shrink-0)
 * Bottom nav: shrink-0
 */
export function MobileShell({
  header,
  bottomNav,
  sidebar,
  dock: dockProp,
  scroll,
  children,
  className,
  mobileRoute,
}: MobileShellProps) {
  const [registeredDock, setRegisteredDock] = useState<ReactNode | null>(null);
  const dock = dockProp ?? registeredDock;
  const scrollContent = scroll ?? children;

  return (
    <MobileShellDockContext.Provider value={{ setDock: setRegisteredDock }}>
      <div
        data-mobile-shell-version="unified-v2"
        data-mobile-route={mobileRoute}
        className={cn(
          "dark flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-[var(--graphite-canvas)] text-slate-50",
          className,
        )}
      >
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {header ? <div className="shrink-0">{header}</div> : null}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative flex min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {scrollContent}
              <div
                className={mobileTokens.scrollContentBottomFade}
                aria-hidden
              />
            </div>

            {dock ? (
              <div
                className={cn(
                  "relative z-10 w-full shrink-0 px-4",
                  mobileTokens.collapsedDockGap,
                )}
              >
                <div className="mx-auto w-full max-w-2xl">{dock}</div>
              </div>
            ) : null}
          </div>

          {bottomNav ? <div className="shrink-0">{bottomNav}</div> : null}
        </div>
      </div>
    </MobileShellDockContext.Provider>
  );
}
