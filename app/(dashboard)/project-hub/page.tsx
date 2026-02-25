"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronDown, Plus, FolderKanban, Loader2, ClipboardList,
  CheckCircle2, AlertTriangle, FolderOpen, MapPin, CreditCard, Cpu, Lightbulb,
  Bell, GripVertical, LayoutDashboard, Palette, Layers, Compass, Globe, Film,
  BarChart3, Plug, User, Shield, X, Maximize2, Minimize2,
} from "lucide-react";
import CreateProjectWizard, { CreateProjectPayload } from "@/components/project-hub/CreateProjectWizard";
import { APIProvider, Map as GoogleMap } from "@vis.gl/react-google-maps";

/* ── Quick-nav items shared across pages ─────────────────────────── */
const QUICK_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Project Hub", href: "/project-hub", icon: FolderKanban },
  { label: "Design Studio", href: "/design-studio", icon: Palette },
  { label: "Content Studio", href: "/content-studio", icon: Layers },
  { label: "360 Tours", href: "/tours", icon: Compass },
  { label: "Geospatial", href: "/geospatial", icon: Globe },
  { label: "Virtual Studio", href: "/virtual-studio", icon: Film },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "SlateDrop", href: "/slatedrop", icon: FolderOpen },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "My Account", href: "/my-account", icon: User },
];

/* ── Default 6 hub widgets ───────────────────────────────────────── */
type HubWidget = { id: string; label: string; icon: React.ElementType; color: string };

const ALL_HUB_WIDGETS: HubWidget[] = [
  { id: "slatedrop", label: "SlateDrop", icon: FolderOpen, color: "#FF4D00" },
  { id: "location", label: "Location", icon: MapPin, color: "#1E3A8A" },
  { id: "data-usage", label: "Data Usage & Credits", icon: CreditCard, color: "#059669" },
  { id: "processing", label: "Processing Jobs", icon: Cpu, color: "#D97706" },
  { id: "suggest", label: "Suggest a Feature", icon: Lightbulb, color: "#7C3AED" },
  { id: "weather", label: "Weather", icon: Globe, color: "#0891B2" },
  { id: "financial", label: "Financial Snapshot", icon: BarChart3, color: "#1E3A8A" },
  { id: "calendar", label: "Calendar", icon: ClipboardList, color: "#DC2626" },
  { id: "contacts", label: "Contacts", icon: User, color: "#059669" },
  { id: "continue", label: "Continue Working", icon: Loader2, color: "#FF4D00" },
];

const DEFAULT_VISIBLE = ["slatedrop", "location", "data-usage", "processing", "suggest", "weather"];
const STORAGE_KEY = "slate360-hub-widgets";

export default function ProjectHubPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "my-work" | "activity">("all");
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  /* Widget order/visibility persistence */
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s); } catch {}
    }
    return DEFAULT_VISIBLE;
  });
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetOrder)); } catch {} }, [widgetOrder]);

  const visibleWidgets = useMemo(() => widgetOrder.map((id) => ALL_HUB_WIDGETS.find((w) => w.id === id)).filter(Boolean) as HubWidget[], [widgetOrder]);

  /* Notifications stub */
  const [notifications] = useState([
    { id: "1", text: "Client Beth uploaded 3 files to SlateDrop", time: "2m ago", unread: true },
    { id: "2", text: "RFI #12 response received from structural consultant", time: "15m ago", unread: true },
    { id: "3", text: "Daily log submitted for Slate360 HQ project", time: "1h ago", unread: false },
    { id: "4", text: "Submittal #8 approved by architect", time: "3h ago", unread: false },
  ]);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      setProjects(data.projects || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async (payload: CreateProjectPayload) => {
    setCreating(true);
    try {
      await fetch("/api/projects/create", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setWizardOpen(false);
      await loadProjects();
    } finally {
      setCreating(false);
    }
  };

  /* Drag-and-drop reorder helpers */
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setWidgetOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const toggleWidget = (id: string) => {
    setWidgetOrder((prev) => prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-[#ECEEF2]">

      {/* ── Sticky top bar with back + quick-nav ──────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="shrink-0">
              <img src="/logo.svg" alt="Slate360" className="h-7 w-auto" />
            </Link>
            <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#FF4D00] transition-colors">
              <ChevronLeft size={16} /> Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setQuickNavOpen(false); }}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <Bell size={16} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF4D00] text-[9px] font-bold text-white flex items-center justify-center">{unreadCount}</span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-900">Notifications</h4>
                      <span className="text-[10px] font-semibold text-[#FF4D00]">{unreadCount} new</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                      {notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 text-xs hover:bg-gray-50 transition-colors ${n.unread ? "bg-orange-50/40" : ""}`}>
                          <p className={`${n.unread ? "font-semibold text-gray-900" : "text-gray-600"}`}>{n.text}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Quick Nav */}
            <div className="relative">
              <button
                onClick={() => { setQuickNavOpen(!quickNavOpen); setNotifOpen(false); }}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <LayoutDashboard size={14} /> Navigate <ChevronDown size={12} />
              </button>
              {quickNavOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setQuickNavOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl py-2 overflow-hidden">
                    {QUICK_NAV.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setQuickNavOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-[#FF4D00]/5 hover:text-[#FF4D00] transition-colors"
                        >
                          <Icon size={14} /> {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 md:px-10 md:py-8 space-y-6 sm:space-y-8">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-3">
            <FolderKanban size={28} className="text-[#1E3A8A]" /> Project Hub
          </h1>
          <button onClick={() => setWizardOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[#FF4D00] px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#E64500] transition-all hover:-translate-y-0.5 hover:shadow-xl w-full sm:w-auto">
            <Plus size={16} /> New Project
          </button>
        </div>

        {/* ── Top Level Stats ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: FolderKanban, bg: "bg-blue-50", text: "text-blue-600", value: projects.length, label: "Total Projects" },
            { icon: ClipboardList, bg: "bg-orange-50", text: "text-[#FF4D00]", value: "12", label: "Open RFIs" },
            { icon: CheckCircle2, bg: "bg-purple-50", text: "text-purple-600", value: "8", label: "Pending Submittals" },
            { icon: AlertTriangle, bg: "bg-red-50", text: "text-red-600", value: "3", label: "Overdue Tasks" },
          ].map(({ icon: SIcon, bg, text, value, label }) => (
            <div key={label} className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300">
              <div className={`p-2.5 sm:p-3 ${bg} ${text} rounded-xl`}><SIcon size={20} /></div>
              <div><p className="text-xl sm:text-2xl font-black text-gray-900">{value}</p><p className="text-[10px] sm:text-xs font-semibold text-gray-500">{label}</p></div>
            </div>
          ))}
        </div>

        {/* ── Tab Navigation ───────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-gray-200 pb-px overflow-x-auto">
          {(["all", "my-work", "activity"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px rounded-t-lg transition-all ${activeTab === tab ? "border-[#FF4D00] text-[#FF4D00] bg-orange-50/50" : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"}`}>
              {tab === "all" ? "All Projects" : tab === "my-work" ? "My Work" : "Activity Feed"}
            </button>
          ))}
        </div>

        {/* ── Content Area ─────────────────────────────────────────── */}
        {activeTab === "all" && (
          loading ? (
            <div className="flex justify-center p-20 text-gray-400"><Loader2 className="animate-spin" /></div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-20 text-center text-gray-500">
              No projects found. Click &quot;New Project&quot; to start building.
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
              {projects.map((p) => (
                <Link key={p.id} href={`/project-hub/${p.id}`} className="group relative flex w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl hover:border-gray-300 hover:-translate-y-1 transition-all">
                  <div className="h-32 w-full bg-gradient-to-br from-[#1E3A8A] to-slate-800 p-4 flex flex-col justify-between">
                    <span className="self-end rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md uppercase tracking-wider">{p.status}</span>
                    <h2 className="text-xl font-black text-white truncate">{p.name}</h2>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <p className="text-sm text-gray-500 line-clamp-2">{p.description || "No description provided."}</p>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs font-semibold text-gray-400">
                      <span>Created: {new Date(p.created_at).toLocaleDateString()}</span>
                      <span className="text-[#FF4D00] group-hover:underline">Open Hub &rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {activeTab === "my-work" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            <ClipboardList size={32} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-900">Your Assigned Tasks</h3>
            <p className="text-sm mt-1">Items across all projects assigned to you will appear here.</p>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-900">Activity Feed</h3>
            <p className="text-sm mt-1">Recent events across all projects will appear here.</p>
          </div>
        )}

        {/* ── Widget Grid (below carousel) ─────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Widgets</h2>
            <button
              onClick={() => setCustomizeOpen(true)}
              className="text-xs font-semibold text-gray-500 hover:text-[#FF4D00] transition-colors"
            >
              Customize Widgets
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {visibleWidgets.map((w, idx) => {
              const Icon = w.icon;
              const isExpanded = expandedWidget === w.id;
              return (
                <div
                  key={w.id}
                  draggable={!isExpanded}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-grab active:cursor-grabbing flex flex-col ${dragIdx === idx ? "opacity-50 scale-95" : ""} ${isExpanded ? "md:col-span-3 min-h-[420px]" : "min-h-[280px]"}`}
                >
                  {/* Widget header */}
                  <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${w.color}1A`, color: w.color }}>
                        <Icon size={20} />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">{w.label}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedWidget(isExpanded ? null : w.id); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      </button>
                      <GripVertical size={14} className="text-gray-300" />
                    </div>
                  </div>
                  {/* Widget body */}
                  <div className="px-6 pb-5 flex-1 flex flex-col gap-3">
                    {w.id === "slatedrop" && (
                      <>
                        <p className="text-xs text-gray-500">Access your project files, share links, and manage uploads.</p>
                        <div className={`flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col justify-between ${isExpanded ? "min-h-[240px]" : "min-h-[100px]"}`}>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs"><span className="text-gray-500">Recent files</span><span className="font-semibold text-gray-700">—</span></div>
                            <div className="flex items-center justify-between text-xs"><span className="text-gray-500">Shared links</span><span className="font-semibold text-gray-700">—</span></div>
                            {isExpanded && <div className="flex items-center justify-between text-xs"><span className="text-gray-500">Pending uploads</span><span className="font-semibold text-gray-700">—</span></div>}
                          </div>
                          <Link href="/slatedrop" className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#FF4D00] text-white text-xs font-bold hover:bg-[#E64500] transition-colors mt-3">
                            <FolderOpen size={14} /> Open SlateDrop
                          </Link>
                        </div>
                      </>
                    )}
                    {w.id === "location" && (
                      <>
                        <p className="text-xs text-gray-500">View project sites, satellite imagery, and location context.</p>
                        <div className={`flex-1 rounded-xl border border-gray-100 overflow-hidden ${isExpanded ? "min-h-[300px]" : "min-h-[140px]"}`}>
                          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
                            <GoogleMap
                              mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
                              defaultCenter={{ lat: 39.5, lng: -98.35 }}
                              defaultZoom={4}
                              disableDefaultUI={!isExpanded}
                              style={{ width: "100%", height: "100%" }}
                            />
                          </APIProvider>
                        </div>
                      </>
                    )}
                    {w.id === "data-usage" && (
                      <>
                        <div className={`flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col gap-4 ${isExpanded ? "min-h-[240px]" : "min-h-[100px]"}`}>
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-gray-500">Storage</span><span className="font-bold text-gray-900">2.4 GB / 50 GB</span></div>
                            <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full bg-[#059669] transition-all" style={{ width: "5%" }} /></div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-gray-500">Credits</span><span className="font-bold text-gray-900">47 remaining</span></div>
                            <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden"><div className="h-full rounded-full bg-[#FF4D00] transition-all" style={{ width: "47%" }} /></div>
                          </div>
                          {isExpanded && (
                            <div className="mt-2 space-y-2 text-xs text-gray-500">
                              <div className="flex justify-between"><span>Processing credits used this month</span><span className="font-semibold text-gray-900">3</span></div>
                              <div className="flex justify-between"><span>Files uploaded this month</span><span className="font-semibold text-gray-900">12</span></div>
                              <div className="flex justify-between"><span>Bandwidth used</span><span className="font-semibold text-gray-900">480 MB</span></div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {w.id === "processing" && (
                      <>
                        <div className={`flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col gap-3 ${isExpanded ? "min-h-[240px]" : "min-h-[100px]"}`}>
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Cpu size={14} /></div>
                            <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-900">No active jobs</p><p className="text-[10px] text-gray-400">Start from Design Studio or Content Studio</p></div>
                          </div>
                          {isExpanded && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center"><CheckCircle2 size={14} /></div>
                                <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-700">Recent: No completed jobs</p><p className="text-[10px] text-gray-400">Your job history will appear here</p></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {w.id === "suggest" && (
                      <>
                        <p className="text-xs text-gray-500">Have an idea? Help us build the features you need.</p>
                        <div className={`flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col justify-between ${isExpanded ? "min-h-[240px]" : "min-h-[100px]"}`}>
                          {isExpanded ? (
                            <div className="space-y-3">
                              <input placeholder="Feature title..." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] outline-none" />
                              <textarea placeholder="Describe your idea..." rows={3} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] outline-none resize-none" />
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">Click expand to write a suggestion</p>
                          )}
                          <button className="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all mt-3">
                            <Lightbulb size={13} className="inline mr-1.5" /> Submit Suggestion
                          </button>
                        </div>
                      </>
                    )}
                    {w.id === "weather" && (
                      <>
                        <div className={`flex-1 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 p-4 flex flex-col justify-center items-center gap-2 ${isExpanded ? "min-h-[240px]" : "min-h-[100px]"}`}>
                          <span className="text-4xl">☀️</span>
                          <p className="text-xl font-black text-gray-900">72°F</p>
                          <p className="text-xs text-gray-500">Partly Cloudy</p>
                          {isExpanded && (
                            <div className="mt-3 grid grid-cols-3 gap-4 text-center w-full max-w-xs">
                              <div><p className="text-[10px] text-gray-400">Wind</p><p className="text-xs font-bold text-gray-700">8 mph</p></div>
                              <div><p className="text-[10px] text-gray-400">Humidity</p><p className="text-xs font-bold text-gray-700">42%</p></div>
                              <div><p className="text-[10px] text-gray-400">UV Index</p><p className="text-xs font-bold text-gray-700">6</p></div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {w.id === "financial" && (
                      <>
                        <div className={`flex-1 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 flex flex-col justify-center items-center ${isExpanded ? "min-h-[240px]" : "min-h-[100px]"}`}>
                          <BarChart3 size={28} className="text-blue-300 mb-2" />
                          <p className="text-xs text-blue-400 text-center">Portfolio budget overview and trends</p>
                          {isExpanded && (
                            <div className="mt-4 w-full space-y-2 text-xs">
                              <div className="flex justify-between"><span className="text-gray-500">Total Portfolio Budget</span><span className="font-bold text-gray-900">—</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Spent</span><span className="font-bold text-gray-900">—</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Remaining</span><span className="font-bold text-gray-900">—</span></div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {w.id === "calendar" && (
                      <>
                        <div className={`flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col gap-2 ${isExpanded ? "min-h-[240px]" : "min-h-[100px]"}`}>
                          <p className="text-xs text-gray-500">Upcoming milestones and deadlines.</p>
                          <p className="text-xs font-semibold text-gray-400 mt-2">No upcoming events</p>
                        </div>
                      </>
                    )}
                    {w.id === "contacts" && (
                      <>
                        <div className={`flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col gap-2 ${isExpanded ? "min-h-[240px]" : "min-h-[100px]"}`}>
                          <p className="text-xs text-gray-500">Quick access to team and external contacts.</p>
                          <p className="text-xs font-semibold text-gray-400 mt-2">0 contacts</p>
                        </div>
                      </>
                    )}
                    {w.id === "continue" && (
                      <>
                        <div className={`flex-1 rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col gap-2 ${isExpanded ? "min-h-[240px]" : "min-h-[100px]"}`}>
                          <p className="text-xs text-gray-500">Pick up where you left off.</p>
                          <p className="text-xs font-semibold text-gray-400 mt-2">No recent activity</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Widget Customization Drawer ────────────────────────────── */}
      {customizeOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={() => setCustomizeOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h3 className="text-base font-black text-gray-900">Customize Widgets</h3>
              <button onClick={() => setCustomizeOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <p className="text-xs text-gray-500 mb-4">Toggle widgets on/off and drag to reorder on the grid.</p>
              {ALL_HUB_WIDGETS.map((w) => {
                const Icon = w.icon;
                const active = widgetOrder.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${active ? "border-[#FF4D00]/30 bg-[#FF4D00]/5" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${w.color}1A`, color: w.color }}>
                      <Icon size={15} />
                    </div>
                    <span className={`text-sm font-semibold ${active ? "text-[#FF4D00]" : "text-gray-700"}`}>{w.label}</span>
                    <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${active ? "text-[#FF4D00]" : "text-gray-400"}`}>
                      {active ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => { setWidgetOrder(DEFAULT_VISIBLE); }}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </>
      )}

      <CreateProjectWizard open={wizardOpen} creating={creating} error={null} onClose={() => setWizardOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}