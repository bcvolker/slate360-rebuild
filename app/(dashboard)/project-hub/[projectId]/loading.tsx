import { Loader2 } from "lucide-react";

export default function ProjectDetailLoading() {
  return (
    <div className="min-h-screen bg-[#ECEEF2]">
      {/* Skeleton header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 sm:py-4 md:px-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="h-7 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="hidden sm:block h-5 w-28 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="h-3 w-16 rounded bg-gray-100 animate-pulse mb-2" />
              <div className="h-7 w-48 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="h-7 w-20 rounded-full bg-gray-100 animate-pulse" />
          </div>
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      </header>

      {/* Skeleton body */}
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 md:px-10 md:py-8 space-y-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      </main>
    </div>
  );
}
