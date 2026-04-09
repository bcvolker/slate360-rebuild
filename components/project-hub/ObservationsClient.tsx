"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  History,
  Loader2,
  MapPin,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  Minus,
  Trash2,
  X,
} from "lucide-react";
import ViewCustomizer, { useViewPrefs } from "@/components/project-hub/ViewCustomizer";
import ChangeHistory, { buildBaseHistory } from "@/components/project-hub/ChangeHistory";
import ObservationForm from "@/components/project-hub/ObservationForm";

/* ---------- types ---------- */
export type Observation = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  sentiment: "positive" | "negative" | "neutral";
  category: string | null;
  location_area: string | null;
  priority: string;
  status: string;
  photos: string[] | null;
  notes: string | null;
  observed_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ObservationFormData = {
  title: string;
  description: string;
  sentiment: "positive" | "negative" | "neutral";
  category: string;
  location_area: string;
  priority: string;
  notes: string;
  observed_at: string;
};

const EMPTY_FORM: ObservationFormData = {
  title: "",
  description: "",
  sentiment: "neutral",
  category: "",
  location_area: "",
  priority: "Medium",
  notes: "",
  observed_at: new Date().toISOString().slice(0, 10),
};

const SENTIMENT_ICON = { positive: ThumbsUp, negative: ThumbsDown, neutral: Minus } as const;
const SENTIMENT_COLOR = {
  positive: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  negative: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  neutral:  { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
} as const;

export default function ObservationsClient() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const [items, setItems] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<ObservationFormData>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterSentiment, setFilterSentiment] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<Observation | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const OBS_COLS = ["title", "sentiment", "category", "priority", "status"];
  const [prefs, setPrefs] = useViewPrefs("observations", OBS_COLS);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/observations`);
      const data = await res.json();
      setItems(data.observations ?? []);
    } catch { /* handled */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const url = `/api/projects/${projectId}/observations`;
      const method = editingId ? "PATCH" : "POST";
      const payload = editingId ? { id: editingId, ...form } : form;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        showToast(editingId ? "Observation updated" : "Observation created");
        setShowCreate(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        await load();
      }
    } catch { /* handled */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this observation?")) return;
    await fetch(`/api/projects/${projectId}/observations`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    showToast("Observation deleted");
    await load();
  };

  const startEdit = (obs: Observation) => {
    setForm({
      title: obs.title,
      description: obs.description ?? "",
      sentiment: obs.sentiment,
      category: obs.category ?? "",
      location_area: obs.location_area ?? "",
      priority: obs.priority,
      notes: obs.notes ?? "",
      observed_at: obs.observed_at?.slice(0, 10) ?? "",
    });
    setEditingId(obs.id);
    setShowCreate(true);
  };

  const exportCSV = () => {
    const header = "Number,Title,Sentiment,Category,Priority,Status,Location,Observed At\n";
    const rows = filtered.map((o) =>
      `${o.number},"${o.title}",${o.sentiment},${o.category ?? ""},${o.priority},${o.status},"${o.location_area ?? ""}",${o.observed_at?.slice(0, 10) ?? ""}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `observations-${projectId}.csv`;
    a.click();
  };

  const filtered = items.filter((o) => {
    if (filterSentiment !== "all" && o.sentiment !== filterSentiment) return false;
    if (search && !o.title.toLowerCase().includes(search.toLowerCase()) && !(o.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: items.length,
    positive: items.filter((o) => o.sentiment === "positive").length,
    negative: items.filter((o) => o.sentiment === "negative").length,
    neutral: items.filter((o) => o.sentiment === "neutral").length,
    open: items.filter((o) => o.status === "Open" || o.status === "In Progress").length,
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Project Management</p>
          <h2 className="text-xl font-black text-gray-900">Observations</h2>
          <p className="mt-0.5 text-sm text-gray-500">Track site observations — positive, negative, or neutral — with photos and notes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export
          </button>
          <ViewCustomizer storageKey="observations" cols={OBS_COLS.map(c => ({ key: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} defaultCols={OBS_COLS} prefs={prefs} onPrefsChange={setPrefs} />
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E64500] transition-colors">
            <Plus size={14} /> New Observation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total", value: counts.total, color: "#D4AF37" },
          { label: "Positive", value: counts.positive, color: "#059669" },
          { label: "Negative", value: counts.negative, color: "#DC2626" },
          { label: "Neutral", value: counts.neutral, color: "#6B7280" },
          { label: "Open", value: counts.open, color: "#D4AF37" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
            <p className="text-xs font-semibold text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search observations…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30"
          />
        </div>
        <select
          value={filterSentiment}
          onChange={(e) => setFilterSentiment(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 focus:border-[#D4AF37] focus:outline-none"
        >
          <option value="all">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="neutral">Neutral</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <Eye size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">{search || filterSentiment !== "all" ? "No matching observations" : "No observations yet"}</p>
          <p className="mt-1 text-xs text-gray-400">Click &quot;New Observation&quot; to add one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((obs) => {
            const SIcon = SENTIMENT_ICON[obs.sentiment];
            const sc = SENTIMENT_COLOR[obs.sentiment];
            const expanded = expandedId === obs.id;
            return (
              <div key={obs.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : obs.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${sc.bg} ${sc.border} border`}>
                    <SIcon size={14} className={sc.text} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-900 truncate">#{obs.number} — {obs.title}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {obs.category && <span className="mr-2">{obs.category}</span>}
                      {obs.location_area && <><MapPin size={10} className="inline mr-0.5" />{obs.location_area}</>}
                    </span>
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} ${sc.border} border`}>{obs.sentiment}</span>
                  <span className="text-xs font-semibold text-gray-500">{obs.status}</span>
                  {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>
                {expanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                      <div><span className="font-semibold text-gray-500">Priority:</span> <span className="font-bold text-gray-900">{obs.priority}</span></div>
                      <div><span className="font-semibold text-gray-500">Status:</span> <span className="font-bold text-gray-900">{obs.status}</span></div>
                      <div><span className="font-semibold text-gray-500">Observed:</span> <span className="font-bold text-gray-900">{obs.observed_at?.slice(0, 10)}</span></div>
                      {obs.resolved_at && <div><span className="font-semibold text-gray-500">Resolved:</span> <span className="font-bold text-gray-900">{obs.resolved_at.slice(0, 10)}</span></div>}
                    </div>
                    {obs.description && <p className="text-sm text-gray-700">{obs.description}</p>}
                    {obs.notes && <p className="text-sm text-gray-600 italic">{obs.notes}</p>}
                    {obs.photos && obs.photos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {obs.photos.map((url, i) => (
                          <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border border-gray-200" />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button onClick={() => startEdit(obs)} className="text-xs font-semibold text-[#D4AF37] hover:underline">Edit</button>
                      <button onClick={() => { setHistoryItem(obs); setShowHistory(true); }} className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1"><History size={12} /> History</button>
                      <div className="flex-1" />
                      <button onClick={() => handleDelete(obs.id)} className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit slide-over */}
      {showCreate && (
        <ObservationForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onClose={() => { setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM); }}
          saving={saving}
          isEditing={!!editingId}
        />
      )}

      {/* History */}
      {historyItem && (
        <ChangeHistory
          open={showHistory}
          title={`Observation #${historyItem.number}`}
          entries={buildBaseHistory({ created_at: historyItem.created_at, updated_at: historyItem.updated_at })}
          subfolder="Records"
          onClose={() => { setHistoryItem(null); setShowHistory(false); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-xl flex items-center gap-2">
          <AlertCircle size={14} /> {toast}
          <button onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}
    </>
  );
}
