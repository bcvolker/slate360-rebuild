import type { ReactNode } from "react";
import "./vnext-tokens.css";

export function VnextRoot({ children }: { children: ReactNode }) {
  return (
    <div data-s360-vnext className="flex min-h-[100dvh] min-w-0 flex-col overflow-x-hidden">
      {children}
    </div>
  );
}
