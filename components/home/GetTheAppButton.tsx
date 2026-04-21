import { Download } from "lucide-react";
import { GetTheAppEnhancer } from "./GetTheAppEnhancer";

/**
 * GetTheAppButton — server-rendered anchor to /install.
 * Plain <a> works at first paint, before hydration, in in-app browsers,
 * even with stale service worker caches. The optional GetTheAppEnhancer
 * upgrades the click to a native install prompt when available.
 */
export default function GetTheAppButton({ className = "" }: { className?: string }) {
  return (
    <>
      <a
        href="/install"
        data-get-the-app
        className={`btn-amber-soft inline-flex items-center justify-center h-12 px-4 sm:px-6 text-base font-semibold rounded-md ${className}`}
      >
        <Download className="mr-1.5 h-4 w-4 shrink-0" />
        <span className="truncate">Get the App</span>
      </a>
      <GetTheAppEnhancer />
    </>
  );
}
