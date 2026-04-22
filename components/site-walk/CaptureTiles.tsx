"use client";

import { Loader2 } from "lucide-react";

export function Tile({
  icon,
  label,
  sub,
  onClick,
  loading,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="aspect-square rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-cobalt/[0.06] hover:border-cobalt/30 hover:shadow-[0_0_24px_-4px_rgba(59,130,246,0.45)] transition disabled:opacity-40 disabled:hover:bg-white/[0.02] disabled:hover:border-white/10 disabled:hover:shadow-none flex flex-col items-center justify-center gap-1 text-slate-100"
    >
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-cobalt" /> : <span className="text-cobalt">{icon}</span>}
      <span className="text-sm font-medium">{label}</span>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </button>
  );
}

export function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
      {icon} {label}
    </span>
  );
}
