"use client";

/**
 * BackButton — subtle chevron-left that calls router.back().
 *
 * Auto-hides on root pages (dashboard / preview home). Keeps visual
 * footprint small so it doesn't crowd the top bar.
 */

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const ROOT_PATHS = new Set<string>([
  "/",
  "/dashboard",
  "/preview/app-shell-v1",
  "/preview/site-walk-v1",
]);

interface BackButtonProps {
  className?: string;
  /** Force-show even on a root path */
  alwaysShow?: boolean;
  /** Override navigation target (defaults to router.back()) */
  href?: string;
}

export function BackButton({ className, alwaysShow = false, href }: BackButtonProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  if (!alwaysShow && ROOT_PATHS.has(pathname)) return null;

  const handle = () => {
    if (href) {
      router.push(href);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label="Go back"
      className={cn(
        "h-9 w-9 flex items-center justify-center rounded-lg",
        "text-slate-400 hover:text-cobalt hover:bg-cobalt/10",
        "transition-colors",
        className
      )}
    >
      <ChevronLeft className="h-[20px] w-[20px]" strokeWidth={2.25} />
    </button>
  );
}

export default BackButton;
