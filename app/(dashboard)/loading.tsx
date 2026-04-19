export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-[#3B82F6] flex items-center justify-center animate-pulse">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9" />
            <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
