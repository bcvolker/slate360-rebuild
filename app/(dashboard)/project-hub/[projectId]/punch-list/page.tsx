"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Filter,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  User,
  Wrench,
  X,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────── */
type PunchItem = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: "Open" | "In Progress" | "Ready for Review" | "Closed";
  priority: "Low" | "Medium" | "High" | "Critical";
  assignee: string | null;
  location_area: string | null;
  trade_category: string | null;
  due_date: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type FormData = {
  title: string;
  description: string;
  status: PunchItem["status"];
  priority: PunchItem["priority"];
  assignee: string;
  location_area: string;
  trade_category: string;
  due_date: string;
};

const STATUSES: PunchItem["status"][] = ["Open", "In Progress", "Ready for Review", "Closed"];
const PRIORITIES: PunchItem["priority"][] = ["Low", "Medium", "High", "Critical"];
const TRADES = [
  "General", "Electrical", "Plumbing", "HVAC", "Painting", "Flooring",
  "Drywall", "Roofing", "Landscaping", "Fire Protection", "Concrete", "Steel",
];

const STATUS_COLORS: Record<string, string> = {
  Open: "bg-red-100 text-red-700 border-red-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
  "Ready for Review": "bg-blue-100 text-blue-700 border-blue-200",
  Closed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

const EMPTY_FORM: FormData = {
  title: "", description: "", status: "Open", priority: "Medium",
  assignee: "", location_area: "", trade_category: "", due_date: "",
};

/* ── Main Component ─────────────────────────────────────────────── */
export default function PunchListPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [items, setItems] = useState<PunchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* ── Load ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/punch-list`, { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  /* ── Filtered & stats ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = items;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.assignee?.toLowerCase().includes(q) || i.location_area?.toLowerCase().includes(q) || String(i.number).includes(q));
    }
    if (filterStatus !== "all") list = list.filter((i) => i.status === filterStatus);
    if (filterPriority !== "all") list = list.filter((i) => i.priority === filterPriority);
    return list;
  }, [items, search, filterStatus, filterPriority]);

  const stats = useMemo(() => ({
    total: items.length,
    open: items.filter((i) => i.status === "Open").length,
    progress: items.filter((i) => i.status === "In Progress").length,
    review: items.filter((i) => i.status === "Ready for Review").length,
    closed: items.filter((i) => i.status === "Closed").length,
  }), [items]);

  /* ── CRUD ─────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!projectId || !form.title.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch(`/api/projects/${projectId}/punch-list`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed");
      setToast(editingId ? "Item updated" : "Item created");
      setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM);
      await load();
    } catch { setToast("Error saving item"); }
    finally { setSaving(false); }
  };

  const quickStatus = async (item: PunchItem, newStatus: PunchItem["status"]) => {
    if (!projectId) return;
    try {
      await fetch(`/api/projects/${projectId}/punch-list`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: newStatus }) });
      setToast(`Marked as ${newStatus}`);
      await load();
    } catch { setToast("Error updating status"); }
  };

  const handleDelete = async (id: string) => {
    if (!projectId || !confirm("Delete this punch item?")) return;
    try {
      await fetch(`/api/projects/${projectId}/punch-list`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setToast("Item deleted"); await load();
    } catch { setToast("Error deleting item"); }
  };

  const startEdit = (item: PunchItem) => {
    setForm({ title: item.title, description: item.description ?? "", status: item.status, priority: item.priority, assignee: item.assignee ?? "", location_area: item.location_area ?? "", trade_category: item.trade_category ?? "", due_date: item.due_date ?? "" });
    setEditingId(item.id); setShowCreate(true);
  };

  /* ── Export CSV ────────────────────────────────────────────────── */
  const exportCSV = () => {
    const header = ["#","Title","Description","Status","Priority","Assignee","Location","Trade","Due Date","Created"];
    const rows = filtered.map((i) => [String(i.number), i.title, i.description ?? "", i.status, i.priority, i.assignee ?? "", i.location_area ?? "", i.trade_category ?? "", i.due_date ?? "", new Date(i.created_at).toLocaleDateString()]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `punch-list-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url); setToast("CSV exported");
  };

  if (!projectId) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Invalid project route.</div>;

  return (
    <section className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Punch List</p>
          <h2 className="text-xl font-black text-gray-900">Deficiency Tracker</h2>
          <p className="mt-1 text-sm text-gray-500">Track, assign, and close out punch items before project completion.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={items.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Download size={14} /> Export
          </button>
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowCreate(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64500] transition">
            <Plus size={15} /> New Item
          </button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([
          { label: "Total", value: stats.total, color: "text-gray-900" },
          { label: "Open", value: stats.open, color: "text-red-600" },
          { label: "In Progress", value: stats.progress, color: "text-amber-600" },
          { label: "Review", value: stats.review, color: "text-blue-600" },
          { label: "Closed", value: stats.closed, color: "text-emerald-600" },
        ] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search & Filters ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showFilters ? "border-[#FF4D00] bg-[#FF4D00]/5 text-[#FF4D00]" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
          <Filter size={14} /> Filters
        </button>
      </div>
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-white p-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none">
              <option value="all">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Priority</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none">
              <option value="all">All</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Items List ──────────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500"><Loader2 size={16} className="mr-2 inline animate-spin" /> Loading punch items…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">No punch items yet</p>
          <p className="mt-1 text-xs text-gray-400">Click &quot;New Item&quot; to create your first deficiency.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">No items match your filters.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isExp = expandedId === item.id;
            return (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all">
                <button onClick={() => setExpandedId(isExp ? null : item.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition">
                  <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[item.status]}`}>{item.status}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">#{item.number}</span>
                      <span className="truncate text-sm font-semibold text-gray-900">{item.title}</span>
                    </div>
                    {item.description && <p className="mt-0.5 truncate text-xs text-gray-500">{item.description}</p>}
                  </div>
                  <span className={`hidden sm:inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
                  {item.assignee && <span className="hidden md:inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600"><User size={9} /> {item.assignee}</span>}
                  {item.location_area && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600"><MapPin size={9} /> {item.location_area}</span>}
                  {item.due_date && <span className="hidden lg:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-gray-500"><Clock size={9} /> {new Date(item.due_date).toLocaleDateString()}</span>}
                  {item.photos.length > 0 && <span className="hidden sm:inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-gray-400"><Camera size={9} /> {item.photos.length}</span>}
                  {isExp ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {isExp && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {([["Status", item.status], ["Priority", item.priority], ["Assignee", item.assignee || "—"], ["Location", item.location_area || "—"], ["Trade", item.trade_category || "—"], ["Due Date", item.due_date ? new Date(item.due_date).toLocaleDateString() : "—"], ["Created", new Date(item.created_at).toLocaleDateString()], ...(item.completed_at ? [["Completed", new Date(item.completed_at).toLocaleDateString()]] : [])] as [string, string][]).map(([l, v]) => (
                        <div key={l}><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p><p className="mt-0.5 text-sm font-semibold text-gray-900">{v}</p></div>
                      ))}
                    </div>
                    {item.description && <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</p><p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{item.description}</p></div>}
                    {item.photos.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Photos ({item.photos.length})</p>
                        <div className="flex flex-wrap gap-2">{item.photos.map((url, i) => (<a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg border border-gray-200"><img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" /></a>))}</div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {item.status !== "Closed" && (
                        <>
                          {item.status === "Open" && <button onClick={() => quickStatus(item, "In Progress")} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"><Clock size={12} /> Start Progress</button>}
                          {(item.status === "Open" || item.status === "In Progress") && <button onClick={() => quickStatus(item, "Ready for Review")} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"><Check size={12} /> Ready for Review</button>}
                          <button onClick={() => quickStatus(item, "Closed")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"><Check size={12} /> Close Item</button>
                        </>
                      )}
                      {item.status === "Closed" && <button onClick={() => quickStatus(item, "Open")} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Reopen</button>}
                      <button onClick={() => startEdit(item)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition ml-auto"><Trash2 size={12} /> Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Slide-over ────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => { setShowCreate(false); setEditingId(null); }}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{editingId ? "Edit Punch Item" : "New Punch Item"}</h3>
              <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-5 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter item title…" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the deficiency…" rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PunchItem["status"] })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as PunchItem["priority"] })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700"><User size={11} className="mr-1 inline" /> Assignee</label>
                  <input type="text" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="Name or company" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700"><Wrench size={11} className="mr-1 inline" /> Trade</label>
                  <select value={form.trade_category} onChange={(e) => setForm({ ...form, trade_category: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                    <option value="">Select trade…</option>
                    {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700"><MapPin size={11} className="mr-1 inline" /> Location / Area</label>
                  <input type="text" value={form.location_area} onChange={(e) => setForm({ ...form, location_area: e.target.value })} placeholder="e.g. Floor 3, Unit 201" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700"><Clock size={11} className="mr-1 inline" /> Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/30" />
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                <Camera size={20} className="mx-auto mb-1 text-gray-400" />
                <p className="text-xs text-gray-500">Photo attachments uploaded via Photos tab or SlateDrop are linked to items.</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleSubmit} disabled={saving || !form.title.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] disabled:opacity-50 transition">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingId ? "Update Item" : "Create Item"}
                </button>
                <button onClick={() => { setShowCreate(false); setEditingId(null); }} className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-lg">{toast}</div>}
    </section>
  );
}
