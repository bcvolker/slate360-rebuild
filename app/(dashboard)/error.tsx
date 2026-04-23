"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error tracking in production
    console.error("[dashboard] route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
        <AlertTriangle size={28} className="text-red-500" />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          An error occurred in this section. Your other tabs are unaffected.
        </p>
        {error.digest && (
          <p className="text-[10px] text-gray-400 mt-2 font-mono">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-foreground bg-[#3B82F6] hover:bg-[#1D4ED8] transition-colors"
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </div>
  );
}
