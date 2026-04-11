"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

export default function ProjectDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ProjectDetail] page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-lg text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>

        <div>
          <h2 className="text-lg font-black text-zinc-100">Unable to Load Project</h2>
          <p className="text-sm text-zinc-400 mt-2">
            Something went wrong while loading this project. This may be a temporary issue or the project data may not be available yet.
          </p>
        </div>

        {error.message && (
          <p className="text-xs text-zinc-500 bg-zinc-800 rounded-lg px-3 py-2 font-mono break-all">
            {error.message}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-zinc-950 hover:bg-[#D4AF37]/80 transition-all"
          >
            <RotateCcw size={14} /> Try Again
          </button>
          <Link
            href="/project-hub"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-2.5 text-sm font-bold text-zinc-200 hover:bg-zinc-700 transition-all"
          >
            <ArrowLeft size={14} /> Back to Project Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
