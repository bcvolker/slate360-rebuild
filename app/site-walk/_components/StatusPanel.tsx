import type { LucideIcon } from "lucide-react";

export function StatusPanel({ icon: Icon, label, count, active, onClick }: { icon: LucideIcon; label: string; count: number; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-left transition ${active ? "border-amber-400/60 bg-amber-500 text-slate-950" : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-amber-400/40 hover:text-amber-200"}`}
    >
      <span className={`flex items-center gap-1.5 ${active ? "text-slate-950" : "text-amber-300"}`}>
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.12em]">{label}</span>
      </span>
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${active ? "bg-slate-950/15 text-slate-950" : "bg-white/10 text-white"}`}>{count}</span>
    </button>
  );
}
