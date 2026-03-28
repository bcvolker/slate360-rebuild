"use client";

import { Calendar, ChevronDown, ChevronUp, History, Send, Trash2, User } from "lucide-react";
import { type Submittal, STATUS_COLORS } from "./_shared";

interface Props {
  sub: Submittal;
  expanded: boolean;
  onToggle: () => void;
  onQuickStatus: (status: string) => void;
  onSend: () => void;
  onSaveAs: () => void;
  onEdit: () => void;
  onHistory: () => void;
  onDelete: () => void;
}

export default function SubmittalsListItem({ sub, expanded, onToggle, onQuickStatus, onSend, onSaveAs, onEdit, onHistory, onDelete }: Props) {
  const btn = "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition";
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm overflow-hidden transition-all">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left hover:bg-zinc-800/50 transition">
        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[sub.status] ?? "bg-zinc-800 text-zinc-400"}`}>{sub.status}</span>
        <div className="flex-1 min-w-0">
          <span className="truncate text-sm font-semibold text-white">{sub.title}</span>
          <p className="mt-0.5 text-xs text-zinc-500">
            {sub.document_type ?? "Submittal"}
            {sub.document_code ? ` · ${sub.document_code}` : ""}
            {sub.spec_section ? ` · Spec: ${sub.spec_section}` : ""}
          </p>
        </div>
        {(sub.revision_number ?? 0) > 0 && <span className="hidden sm:inline-flex shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400">Rev {sub.revision_number}</span>}
        {sub.responsible_contractor && <span className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400"><User size={9} /> {sub.responsible_contractor}</span>}
        {sub.due_date && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-zinc-500"><Calendar size={9} /> {new Date(sub.due_date).toLocaleDateString()}</span>}
        {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
      </button>
      {expanded && (
        <div className="border-t border-zinc-800 bg-zinc-800/30 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {([
              ["Type", sub.document_type || "Submittal"], ["Doc Code", sub.document_code || "—"],
              ["Amount", sub.amount ? `$${Number(sub.amount).toLocaleString()}` : "—"], ["Version", String(sub.version_number ?? 1)],
              ["Status", sub.status], ["Spec Section", sub.spec_section || "—"],
              ["Revision", String(sub.revision_number ?? 0)], ["Contractor", sub.responsible_contractor || "—"],
              ["Due Date", sub.due_date ? new Date(sub.due_date).toLocaleDateString() : "—"],
              ["Required Date", sub.required_date ? new Date(sub.required_date).toLocaleDateString() : "—"],
              ["Lead Time", sub.lead_time_days ? `${sub.lead_time_days} days` : "—"],
              ["Sent", sub.sent_at ? new Date(sub.sent_at).toLocaleString() : "—"],
              ["Response", sub.last_response_at ? new Date(sub.last_response_at).toLocaleString() : "—"],
              ["Stakeholder", sub.stakeholder_email || "—"],
              ["Created", new Date(sub.created_at).toLocaleDateString()],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l}><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{l}</p><p className="mt-0.5 text-sm font-semibold text-zinc-200">{v}</p></div>
            ))}
          </div>
          {sub.response_text && (
            <div className="rounded-lg border border-blue-900/50 bg-blue-950/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Response / Notes</p>
              <p className="text-sm text-blue-300 whitespace-pre-wrap">{sub.response_text}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {sub.status !== "Approved" && sub.status !== "Closed" && <button onClick={() => onQuickStatus("Approved")} className={`${btn} border-emerald-900/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50`}>Approve</button>}
            {sub.status !== "Closed" && <button onClick={() => onQuickStatus("Closed")} className={`${btn} border-blue-900/50 bg-blue-950/30 text-blue-400 hover:bg-blue-950/50`}>Close</button>}
            <button onClick={onSend} className={`${btn} border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}><Send size={12} /> Send</button>
            <button onClick={onSaveAs} className={`${btn} border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}>Save As</button>
            <button onClick={onEdit} className={`${btn} border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700`}>Edit</button>
            <button onClick={onHistory} className={`${btn} border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700`}><History size={12} /> History</button>
            <button onClick={onDelete} className={`${btn} border-red-900/50 bg-zinc-800 text-red-400 hover:bg-red-950/30 ml-auto`}><Trash2 size={12} /> Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
