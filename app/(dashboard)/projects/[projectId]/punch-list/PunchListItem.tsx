"use client";

import { Camera, Check, ChevronDown, ChevronUp, Clock, History, MapPin, Trash2, User } from "lucide-react";
import { type PunchItem, STATUS_COLORS, PRIORITY_COLORS } from "./_shared";

interface Props {
  item: PunchItem;
  isExpanded: boolean;
  onToggle: () => void;
  onQuickStatus: (item: PunchItem, status: PunchItem["status"]) => void;
  onEdit: (item: PunchItem) => void;
  onHistory: (item: PunchItem) => void;
  onDelete: (id: string) => void;
}

export default function PunchListItem({ item, isExpanded, onToggle, onQuickStatus, onEdit, onHistory, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-card shadow-sm overflow-hidden transition-all">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left hover:bg-card/50 transition">
        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[item.status]}`}>{item.status}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500">#{item.number}</span>
            <span className="truncate text-sm font-semibold text-foreground">{item.title}</span>
          </div>
          {item.description && <p className="mt-0.5 truncate text-xs text-zinc-500">{item.description}</p>}
        </div>
        <span className={`hidden sm:inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
        {item.assignee && <span className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-zinc-400"><User size={9} /> {item.assignee}</span>}
        {item.location_area && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-zinc-400"><MapPin size={9} /> {item.location_area}</span>}
        {item.due_date && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-zinc-500"><Clock size={9} /> {new Date(item.due_date).toLocaleDateString()}</span>}
        {item.photos.length > 0 && <span className="hidden sm:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-zinc-500"><Camera size={9} /> {item.photos.length}</span>}
        {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800 bg-card/30 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {([ ["Status", item.status], ["Priority", item.priority], ["Assignee", item.assignee || "—"], ["Location", item.location_area || "—"], ["Trade", item.trade_category || "—"], ["Due Date", item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"], ["Created", new Date(item.created_at).toLocaleDateString()], ...(item.completed_at ? [["Completed", new Date(item.completed_at).toLocaleDateString()]] : []) ] as [string, string][]).map(([l, v]) => (
              <div key={l}><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{l}</p><p className="mt-0.5 text-sm font-semibold text-foreground">{v}</p></div>
            ))}
          </div>
          {item.description && <div><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Description</p><p className="mt-1 text-sm text-zinc-300 whitespace-pre-wrap">{item.description}</p></div>}
          {item.photos.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Photos ({item.photos.length})</p>
              <div className="flex flex-wrap gap-2">{item.photos.map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-zinc-700"><img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" /></a>))}</div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {item.status !== "Closed" && (
              <>
                {item.status === "Open" && <button onClick={() => onQuickStatus(item, "In Progress")} className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition"><Clock size={12} /> Start Progress</button>}
                {(item.status === "Open" || item.status === "In Progress") && <button onClick={() => onQuickStatus(item, "Ready for Review")} className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition"><Check size={12} /> Ready for Review</button>}
                <button onClick={() => onQuickStatus(item, "Closed")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"><Check size={12} /> Close Item</button>
              </>
            )}
            {item.status === "Closed" && <button onClick={() => onQuickStatus(item, "Open")} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition">Reopen</button>}
            <button onClick={() => onEdit(item)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition">Edit</button>
            <button onClick={() => onHistory(item)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-card px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-700 transition"><History size={12} /> History</button>
            <button onClick={() => onDelete(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-900/40 bg-card px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-950/30 transition ml-auto"><Trash2 size={12} /> Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}