import Link from "next/link";

export default function PreviewHub() {
  return (
    <div className="min-h-screen bg-slate-950 dark flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Slate360 Preview Hub</h1>
          <p className="text-sm text-slate-400">Design previews and component demonstrations</p>
        </div>

        {/* Preview Cards */}
        <div className="grid grid-cols-1 gap-4">
          {/* Mobile Shell Preview */}
          <Link href="/preview/mobile-shell-v2">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group mb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-200 group-hover:text-amber-500 transition-colors mb-1">Mobile Shell V2 (Version 1)</h2>
                  <p className="text-sm text-slate-500">Updated design aligning with Version 1 launch goals</p>
                </div>
                <div className="w-8 h-8 bg-amber-500/10 rounded flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/preview/site-walk">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group mb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-200 group-hover:text-amber-500 transition-colors mb-1">Site Walk Phase 1</h2>
                  <p className="text-sm text-slate-500">Core Version 1 workflow</p>
                </div>
                <div className="w-8 h-8 bg-amber-500/10 rounded flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/preview/mobile-shell">
            <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-lg hover:bg-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-200 group-hover:text-slate-100 transition-colors mb-1">Mobile Shell</h2>
                  <p className="text-sm text-slate-500">Slate360 mobile app interface preview</p>
                </div>
                <div className="w-8 h-8 bg-amber-500/10 rounded flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-4 bg-slate-900/30 border border-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-500">Preview-only routes. No production data or analytics.</p>
        </div>
      </div>
    </div>
  );
}
