"use client";

import { Calendar, ChevronDown, ChevronUp, DollarSign, History, Send, Trash2, User } from "lucide-react";
import { type RFI, STATUS_COLORS } from "./_shared";

interface Props {
  rfi: RFI;
  isExpanded: boolean;
  onToggle: () => void;
  onQuickStatus: (rfi: RFI, status: string) => void;
  onSendToClient: (rfiId: string) => void;
  onEdit: (rfi: RFI) => void;
  onHistory: (rfi: RFI) => void;
  onDelete: (id: string) => void;
}

export default function RFIItem({ rfi, isExpanded, onToggle, onQuickStatus, onSendToClient, onEdit, onHistory, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-card shadow-sm overflow-hidden transition-all">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left hover:bg-card/50 transition">
        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[rfi.status] ?? "bg-card text-zinc-400"}`}>{rfi.status}</span>
        <div className="flex-1 min-w-0">
          <span className="truncate text-sm font-semibold text-foreground">{rfi.subject}</span>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{rfi.question}</p>
        </div>
        {rfi.assigned_to && <span className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-zinc-400"><User size={9} /> {rfi.assigned_to}</span>}
        {rfi.due_date && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-zinc-500"><Calendar size={9} /> {new Date(rfi.due_date).toLocaleDateString()}</span>}
        {(rfi.cost_impact ?? 0) > 0 && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-orange-400"><DollarSign size={9} /> ${Number(rfi.cost_impact).toLocaleString()}</span>}
        {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800 bg-card/30 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {([["Status", rfi.status], ["Priority", rfi.priority ?? "Normal"], ["Assigned To", rfi.assigned_to || "—"], ["Ball in Court", rfi.ball_in_court || "—"], ["Due Date", rfi.due_date ? new Date(rfi.due_date).toLocaleDateString() : "—"], ["Cost Impact", `$${Number(rfi.cost_impact ?? 0).toLocaleString()}`], ["Schedule Impact", `${rfi.schedule_impact ?? 0} days`], ["Created", new Date(rfi.created_at).toLocaleDateString()]] as [string, string][]).map(([l, v]) => (
              <div key={l}><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{l}</p><p className="mt-0.5 text-sm font-semibold text-foreground">{v}</p></div>
            ))}
          </div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Question</p><p className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap">{rfi.question}</p></div>
          {rfi.response_text && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Response</p>
              <p className="text-sm text-blue-300 whitespace-pre-wrap">{rfi.response_text}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {rfi.status !== "Closed" && <button onClick={() => onQuickStatus(rfi, "Closed")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition">Close</button>}
            {rfi.status === "Closed" && <button onClick={() => onQuickStatus(rfi, "Open")} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition">Reopen</button>}
            <button onClick={() => onSendToClient(rfi.id)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition"><Send size={12} /> Send to Client</button>
            <button onClick={() => onEdit(rfi)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition">Edit</button>
            <button onClick={() => onHistory(rfi)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-700 transition"><History size={12} /> History</button>
            <button onClick={() => onDelete(rfi.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-900/40 bg-card px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-950/30 transition ml-auto"><Trash2 size={12} /> Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
