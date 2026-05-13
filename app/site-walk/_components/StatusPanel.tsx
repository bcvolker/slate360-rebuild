import type { LucideIcon } from "lucide-react";

export function StatusPanel({ icon: Icon, label, count, empty }: { icon: LucideIcon; label: string; count: number; empty: string }) {
  return (
    <div className="min-h-20 rounded-[1.25rem] border border-white/10 bg-white/[0.045] p-3">
      <div className="flex items-center gap-2 text-amber-300">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</span>
      </div>
      {count > 0 ? (
        <p className="mt-2 text-2xl font-black text-white">{count}</p>
      ) : (
        <p className="mt-2 text-xs font-bold leading-snug text-slate-500">{empty}</p>
      )}
    </div>
  );
}
