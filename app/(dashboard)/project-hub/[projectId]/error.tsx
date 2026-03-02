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
    <div className="min-h-screen bg-[#ECEEF2] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>

        <div>
          <h2 className="text-lg font-black text-gray-900">Unable to Load Project</h2>
          <p className="text-sm text-gray-500 mt-2">
            Something went wrong while loading this project. This may be a temporary issue or the project data may not be available yet.
          </p>
        </div>

        {error.message && (
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 font-mono break-all">
            {error.message}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4D00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#E64500] transition-all"
          >
            <RotateCcw size={14} /> Try Again
          </button>
          <Link
            href="/project-hub"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={14} /> Back to Project Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
