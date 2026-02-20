"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import {
  Search,
  Bell,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  Activity,
  CreditCard,
  TrendingUp,
  Calendar as CalendarIcon,
  Users,
  Cloud,
  Lightbulb,
  Clock,
  Cpu,
  FolderOpen,
  BarChart3,
  Zap,
  MapPin,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Wind,
  Droplets,
  Sun,
  CloudSun,
  UserPlus,
  MessageSquare,
  Palette,
  Globe,
  Film,
  Layers,
  Compass,
  CloudRain,
  Snowflake,
  type LucideIcon,
  User,
  Shield,
  LayoutDashboard,
  SlidersHorizontal,
  GripVertical,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ChevronUp,
  FileText,
  ArrowUpRight,
  X,
} from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

interface DashboardProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
}

interface Project {
  id: string;
  name: string;
  location: string;
  thumbnail: string;
  status: "active" | "completed" | "on-hold";
  lastEdited: string;
  type: "3d" | "360" | "geo" | "plan";
}

interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  color: string;
  project?: string;
}

interface Contact {
  name: string;
  role: string;
  project: string;
  initials: string;
  color: string;
}

interface Job {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: "completed" | "processing" | "queued" | "failed";
}

interface DashTab {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  isCEOOnly?: boolean;
}

interface WidgetPref {
  id: string;
  visible: boolean;
  expanded: boolean; // takes full row width
  order: number;
}

/* ================================================================
   WIDGET META — source of truth for labels/icons
   ================================================================ */

const WIDGET_META: { id: string; label: string; icon: LucideIcon; tierGate?: string }[] = [
  { id: "slatedrop",    label: "SlateDrop",             icon: FolderOpen },
  { id: "data-usage",   label: "Data Usage & Credits", icon: CreditCard },
  { id: "processing",   label: "Processing Jobs",       icon: Cpu },
  { id: "financial",    label: "Financial Snapshot",    icon: TrendingUp },
  { id: "calendar",     label: "Calendar",              icon: CalendarIcon },
  { id: "weather",      label: "Weather",               icon: Cloud },
  { id: "continue",     label: "Continue Working",      icon: Clock },
  { id: "contacts",     label: "Contacts",              icon: Users },
  { id: "suggest",      label: "Suggest a Feature",     icon: Lightbulb },
  { id: "seats",        label: "Seat Management",       icon: Users,       tierGate: "seats" },
  { id: "upgrade",      label: "Upgrade Card",          icon: Zap,         tierGate: "no-seats" },
];

const DEFAULT_WIDGET_PREFS: WidgetPref[] = WIDGET_META.map((m, i) => ({
  id: m.id,
  visible: true,
  expanded: m.id === "calendar" || m.id === "seats",
  order: i,
}));

/* ================================================================
   DEMO DATA
   ================================================================ */

const demoProjects: Project[] = [
  {
    id: "p1",
    name: "Maple Heights Residence",
    location: "Denver, CO",
    thumbnail: "/uploads/pletchers.jpg",
    status: "active",
    lastEdited: "2 hours ago",
    type: "3d",
  },
  {
    id: "p2",
    name: "Harbor Point Office Tower",
    location: "San Diego, CA",
    thumbnail: "",
    status: "active",
    lastEdited: "5 hours ago",
    type: "360",
  },
  {
    id: "p3",
    name: "Riverside Bridge Retrofit",
    location: "Portland, OR",
    thumbnail: "",
    status: "on-hold",
    lastEdited: "2 days ago",
    type: "geo",
  },
  {
    id: "p4",
    name: "Lakeview Community Center",
    location: "Austin, TX",
    thumbnail: "",
    status: "completed",
    lastEdited: "1 week ago",
    type: "plan",
  },
];

const demoEvents: CalEvent[] = [
  { id: "e1", title: "Site inspection — Maple Heights", date: "2026-02-22", color: "#FF4D00", project: "Maple Heights" },
  { id: "e2", title: "Client presentation", date: "2026-02-25", color: "#1E3A8A", project: "Harbor Point" },
  { id: "e3", title: "Concrete pour — Block C", date: "2026-02-27", color: "#FF4D00", project: "Maple Heights" },
  { id: "e4", title: "Foundation review", date: "2026-03-01", color: "#059669" },
  { id: "e5", title: "Drone survey scheduled", date: "2026-03-05", color: "#1E3A8A", project: "Riverside Bridge" },
  { id: "e6", title: "Budget sync — Q1 close", date: "2026-02-28", color: "#7C3AED" },
];

const demoContacts: Contact[] = [
  { name: "Sarah Chen", role: "Project Manager", project: "Maple Heights", initials: "SC", color: "#FF4D00" },
  { name: "Mike Torres", role: "Architect", project: "Harbor Point", initials: "MT", color: "#1E3A8A" },
  { name: "Lisa Park", role: "GC Superintendent", project: "Riverside Bridge", initials: "LP", color: "#059669" },
  { name: "James Wilson", role: "Structural Eng.", project: "Harbor Point", initials: "JW", color: "#7C3AED" },
  { name: "Amy Richards", role: "Interior Designer", project: "Lakeview Center", initials: "AR", color: "#D97706" },
];

const demoJobs: Job[] = [
  { id: "j1", name: "Stadium model — Photogrammetry", type: "3D Processing", progress: 100, status: "completed" },
  { id: "j2", name: "Site scan 360 — HDR merge", type: "360 Processing", progress: 45, status: "processing" },
  { id: "j3", name: "Bridge deck — Point cloud", type: "Geospatial", progress: 0, status: "queued" },
  { id: "j4", name: "Floor plan — PDF to 3D", type: "Conversion", progress: 78, status: "processing" },
];

const demoFinancial = [
  { month: "Sep", credits: 2400 },
  { month: "Oct", credits: 3100 },
  { month: "Nov", credits: 2800 },
  { month: "Dec", credits: 1900 },
  { month: "Jan", credits: 3500 },
  { month: "Feb", credits: 1200 },
];

const demoWeather = {
  location: "Denver, CO",
  current: { temp: 38, condition: "Partly Cloudy", humidity: 45, wind: 14, icon: "cloud-sun" as const },
  alert: "Wind advisory: Gusts up to 35 mph expected Thursday PM — review crane safety protocols",
  forecast: [
    { day: "Thu", hi: 42, lo: 28, icon: "cloud-sun" as const, precip: 10 },
    { day: "Fri", hi: 35, lo: 22, icon: "snow" as const, precip: 70 },
    { day: "Sat", hi: 38, lo: 25, icon: "cloud" as const, precip: 20 },
    { day: "Sun", hi: 45, lo: 30, icon: "sun" as const, precip: 5 },
    { day: "Mon", hi: 48, lo: 32, icon: "rain" as const, precip: 60 },
  ],
  constructionAlerts: [
    { type: "wind", message: "Gusts over 25 mph Thursday — crane ops affected", severity: "warning" as const },
    { type: "temp", message: "Below 40°F — monitor concrete curing conditions", severity: "caution" as const },
    { type: "precip", message: "Rain likely Monday — tarps recommended", severity: "info" as const },
  ],
};

const demoContinueWorking = [
  { title: "Maple Heights — Design Studio", subtitle: "3D model editing in progress", time: "2h ago", icon: Palette, href: "/dashboard" },
  { title: "Harbor Point — 360 Tour", subtitle: "3 new annotations to review", time: "5h ago", icon: Compass, href: "/dashboard" },
  { title: "Bridge Retrofit — RFI #12", subtitle: "Needs your response", time: "1d ago", icon: MessageSquare, href: "/dashboard" },
  { title: "Lakeview Center — Reports", subtitle: "Q4 summary ready for export", time: "2d ago", icon: BarChart3, href: "/dashboard" },
];

const demoSeatMembers = [
  { name: "You", role: "Owner", email: "you@company.com", active: true },
  { name: "Sarah Chen", role: "Admin", email: "sarah@company.com", active: true },
  { name: "Mike Torres", role: "Member", email: "mike@company.com", active: true },
  { name: "Lisa Park", role: "Member", email: "lisa@company.com", active: false },
];

/* ================================================================
   HELPERS
   ================================================================ */

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: { day: number; inMonth: boolean; dateStr: string }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({ day: d, inMonth: false, dateStr: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, inMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}` });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, inMonth: false, dateStr: `${year}-${String(month + 2).padStart(2, "0")}-${String(i).padStart(2, "0")}` });
  }
  return cells;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const weatherIcon = (icon: string) => {
  switch (icon) {
    case "sun": return <Sun size={18} className="text-amber-400" />;
    case "cloud-sun": return <CloudSun size={18} className="text-gray-400" />;
    case "cloud": return <Cloud size={18} className="text-gray-400" />;
    case "rain": return <CloudRain size={18} className="text-blue-400" />;
    case "snow": return <Snowflake size={18} className="text-sky-300" />;
    default: return <Sun size={18} className="text-amber-400" />;
  }
};

const statusColor = (s: Job["status"]) => {
  switch (s) {
    case "completed": return "text-emerald-600 bg-emerald-50";
    case "processing": return "text-amber-600 bg-amber-50";
    case "queued": return "text-gray-500 bg-gray-100";
    case "failed": return "text-red-600 bg-red-50";
  }
};

const statusIcon = (s: Job["status"]) => {
  switch (s) {
    case "completed": return <CheckCircle2 size={13} />;
    case "processing": return <Loader2 size={13} className="animate-spin" />;
    case "queued": return <Clock size={13} />;
    case "failed": return <XCircle size={13} />;
  }
};

const projectTypeEmoji = (t: Project["type"]) => {
  switch (t) {
    case "3d": return "🏗️";
    case "360": return "📷";
    case "geo": return "🛰️";
    case "plan": return "📐";
  }
};

/* ================================================================
   WIDGET CARD WRAPPER
   ================================================================ */

function WidgetCard({
  icon: Icon,
  title,
  action,
  span,
  children,
  delay = 0,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  span?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${span ?? ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}
          >
            <Icon size={18} />
          </div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ================================================================
   TAB WIREFRAME PLACEHOLDER
   ================================================================ */

function TabWireframe({ tab, onBack, onOpenSlateDrop }: { tab: DashTab; onBack: () => void; onOpenSlateDrop?: () => void }) {
  const Icon = tab.icon;
  const descMap: Record<string, string> = {
    "project-hub":    "Centralized project management, RFIs, daily reports, and team coordination.",
    "design-studio":  "3D modelling, BIM coordination, and real-time design collaboration.",
    "content-studio": "Create and manage visual content, renderings, and marketing assets.",
    "tours":          "Immersive 360° virtual tours for client presentations and remote inspections.",
    "geospatial":     "Drone surveys, point clouds, GIS mapping, and geospatial data workflows.",
    "virtual-studio": "Virtual production, site visualization, and simulation environments.",
    "analytics":      "Project analytics, progress tracking, financial reporting, and insights.",
    "slatedrop":      "Intelligent file management, delivery, and secure document sharing.",
    "my-account":     "Manage your profile, subscription, billing, and account settings.",
    "ceo":            "Platform-wide oversight, admin controls, and strategic metrics.",
    "market":         "Marketplace listings, procurement workflows, and vendor management.",
    "athlete360":     "Athletic performance tracking, recruitment tools, and 360° athlete profiles.",
  };
  const desc = descMap[tab.id] ?? `The ${tab.label} workspace is coming soon.`;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm"
        style={{ backgroundColor: `${tab.color}18`, color: tab.color }}
      >
        <Icon size={36} />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">{tab.label}</h2>
      {tab.isCEOOnly && (
        <span className="inline-block mb-3 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
          CEO Access Only
        </span>
      )}
      <p className="text-sm text-gray-400 mb-8 max-w-sm leading-relaxed">{desc}</p>
      {tab.id === "slatedrop" && (
        <button
          onClick={onOpenSlateDrop}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 mb-4"
          style={{ backgroundColor: "#FF4D00" }}
        >
          Open SlateDrop <ArrowRight size={15} />
        </button>
      )}
      <button
        onClick={onBack}
        className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5 mt-2"
      >
        <ChevronLeft size={13} /> Back to Overview
      </button>
    </div>
  );
}

/* ================================================================
   MAIN DASHBOARD COMPONENT
   ================================================================ */

export default function DashboardClient({ user, tier }: DashboardProps) {
  const ent = getEntitlements(tier);
  const supabase = createClient();

  // CEO / special-access check — only slate360ceo@gmail.com sees CEO tabs
  const isCEO = user.email === "slate360ceo@gmail.com";

  // Build the ordered, filtered tab list based on tier entitlements + identity
  const visibleTabs: DashTab[] = ([
    { id: "project-hub",    label: "Project Hub",    icon: LayoutDashboard, color: "#1E3A8A" },
    { id: "design-studio",  label: "Design Studio",  icon: Palette,         color: "#FF4D00" },
    { id: "content-studio", label: "Content Studio", icon: Layers,          color: "#1E3A8A" },
    { id: "tours",          label: "360 Tours",      icon: Compass,         color: "#FF4D00" },
    { id: "geospatial",     label: "Geospatial",     icon: Globe,           color: "#1E3A8A" },
    { id: "virtual-studio", label: "Virtual Studio", icon: Film,            color: "#FF4D00" },
    { id: "analytics",      label: "Analytics",      icon: BarChart3,       color: "#1E3A8A" },
    { id: "slatedrop",      label: "SlateDrop",      icon: FolderOpen,      color: "#FF4D00" },
    { id: "my-account",     label: "My Account",     icon: User,            color: "#1E3A8A" },
    ...(isCEO ? ([
      { id: "ceo",        label: "CEO",        icon: Shield,      color: "#FF4D00", isCEOOnly: true },
      { id: "market",     label: "Market",     icon: TrendingUp,  color: "#1E3A8A", isCEOOnly: true },
      { id: "athlete360", label: "Athlete360", icon: Zap,         color: "#FF4D00", isCEOOnly: true },
    ] as DashTab[]) : []),
  ] as DashTab[]).filter((tab) => {
    switch (tab.id) {
      case "project-hub":    return ent.canAccessHub;
      case "design-studio":  return ent.canAccessDesignStudio;
      case "content-studio": return ent.canAccessContent;
      case "tours":          return ent.canAccessTourBuilder;
      case "geospatial":     return ent.canAccessGeospatial;
      case "virtual-studio": return ent.canAccessVirtual;
      case "analytics":      return ent.canAccessAnalytics;
      case "slatedrop":      return ent.canViewSlateDropWidget;
      case "my-account":     return true;
      case "ceo":
      case "market":
      case "athlete360":     return isCEO;
      default:               return false;
    }
  });

  const [selectedProject, setSelectedProject] = useState("all");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calSelected, setCalSelected] = useState<string | null>(null);
  const [events, setEvents] = useState<CalEvent[]>(demoEvents);
  const [addingEvent, setAddingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestDesc, setSuggestDesc] = useState("");
  const [suggestPriority, setSuggestPriority] = useState("medium");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestDone, setSuggestDone] = useState(false);
  const [weatherLogged, setWeatherLogged] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(DEFAULT_WIDGET_PREFS);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // ── SlateDrop floating window ───────────────────────────────
  const [slateDropOpen, setSlateDropOpen] = useState(false);
  const [sdMinimized, setSdMinimized] = useState(false);
  const [sdPos, setSdPos] = useState({ x: 0, y: 0 });
  const [sdSize, setSdSize] = useState({ w: 1000, h: 680 });
  const sdDragMode = useRef<"title" | "resize" | null>(null);
  const sdDragStart = useRef({ clientX: 0, clientY: 0, startX: 0, startY: 0, startW: 0, startH: 0 });

  function openSlateDrop() {
    setSdPos({
      x: Math.max(0, (window.innerWidth - 1000) / 2),
      y: Math.max(10, (window.innerHeight - 680) / 4),
    });
    setSdSize({ w: 1000, h: 680 });
    setSdMinimized(false);
    setSlateDropOpen(true);
  }

  function onSdTitleDown(e: React.PointerEvent) {
    sdDragMode.current = "title";
    sdDragStart.current = { clientX: e.clientX, clientY: e.clientY, startX: sdPos.x, startY: sdPos.y, startW: sdSize.w, startH: sdSize.h };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onSdResizeDown(e: React.PointerEvent) {
    sdDragMode.current = "resize";
    sdDragStart.current = { clientX: e.clientX, clientY: e.clientY, startX: sdPos.x, startY: sdPos.y, startW: sdSize.w, startH: sdSize.h };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }
  function onSdPointerMove(e: React.PointerEvent) {
    if (!sdDragMode.current) return;
    const dx = e.clientX - sdDragStart.current.clientX;
    const dy = e.clientY - sdDragStart.current.clientY;
    if (sdDragMode.current === "title") {
      setSdPos({ x: sdDragStart.current.startX + dx, y: sdDragStart.current.startY + dy });
    } else {
      setSdSize({ w: Math.max(560, sdDragStart.current.startW + dx), h: Math.max(420, sdDragStart.current.startH + dy) });
    }
  }
  function onSdPointerUp() { sdDragMode.current = null; }

  /* ── Load saved prefs from Supabase user metadata on mount ─── */
  useState(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      const saved = u?.user_metadata?.dashboardWidgets as WidgetPref[] | undefined;
      if (saved && Array.isArray(saved) && saved.length > 0) {
        // Merge saved prefs with any new widgets added since last save
        const merged = DEFAULT_WIDGET_PREFS.map((def) => {
          const found = saved.find((s) => s.id === def.id);
          return found ?? def;
        });
        setWidgetPrefs(merged);
      }
    });
  });

  const carouselRef = useRef<HTMLDivElement>(null);

  /* ── Derived ── */
  const calDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const filteredContacts = useMemo(
    () =>
      demoContacts.filter(
        (c) =>
          c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.project.toLowerCase().includes(contactSearch.toLowerCase())
      ),
    [contactSearch]
  );

  const selectedDayEvents = useMemo(
    () => (calSelected ? events.filter((e) => e.date === calSelected) : []),
    [calSelected, events]
  );

  const creditsUsed = 1847;
  const storageUsed = ent.tier === "trial" ? 1.2 : ent.tier === "creator" ? 12 : 45;

  /* ── Handlers ── */
  const scrollCarousel = useCallback((dir: number) => {
    carouselRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [supabase]);

  const handleAddEvent = useCallback(() => {
    if (!newEventTitle.trim() || !calSelected) return;
    const ev: CalEvent = {
      id: `e${Date.now()}`,
      title: newEventTitle.trim(),
      date: calSelected,
      color: "#FF4D00",
    };
    setEvents((prev) => [...prev, ev]);
    setNewEventTitle("");
    setAddingEvent(false);
  }, [newEventTitle, calSelected]);

  const handleSuggestFeature = useCallback(async () => {
    if (!suggestTitle.trim() || !suggestDesc.trim()) return;
    setSuggestLoading(true);
    try {
      await fetch("/api/suggest-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestTitle,
          description: suggestDesc,
          priority: suggestPriority,
        }),
      });
      setSuggestDone(true);
      setSuggestTitle("");
      setSuggestDesc("");
      setTimeout(() => setSuggestDone(false), 4000);
    } catch {
      // silently handle
    } finally {
      setSuggestLoading(false);
    }
  }, [suggestTitle, suggestDesc, suggestPriority]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  /* ── Pref helpers ── */
  const toggleVisible = useCallback((id: string) => {
    setWidgetPrefs((prev) => prev.map((p) => p.id === id ? { ...p, visible: !p.visible } : p));
    setPrefsDirty(true);
  }, []);
  const toggleExpanded = useCallback((id: string) => {
    setWidgetPrefs((prev) => prev.map((p) => p.id === id ? { ...p, expanded: !p.expanded } : p));
    setPrefsDirty(true);
  }, []);
  const moveWidget = useCallback((id: string, dir: -1 | 1) => {
    setWidgetPrefs((prev) => {
      const arr = [...prev].sort((a, b) => a.order - b.order);
      const idx = arr.findIndex((p) => p.id === id);
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      const newArr = arr.map((p, i) => {
        if (i === idx) return { ...p, order: arr[target].order };
        if (i === target) return { ...p, order: arr[idx].order };
        return p;
      });
      return newArr;
    });
    setPrefsDirty(true);
  }, []);
  const savePrefs = useCallback(async () => {
    setPrefsSaving(true);
    try {
      await supabase.auth.updateUser({ data: { dashboardWidgets: widgetPrefs } });
      setPrefsDirty(false);
    } finally {
      setPrefsSaving(false);
    }
  }, [supabase, widgetPrefs]);
  const resetPrefs = useCallback(() => {
    setWidgetPrefs(DEFAULT_WIDGET_PREFS);
    setPrefsDirty(true);
  }, []);

  const financialMax = Math.max(...demoFinancial.map((f) => f.credits));

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* ════════ TOP BAR ════════ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Left — Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.svg" alt="Slate360" className="h-7 w-auto" />
          </Link>

          {/* Center — Search */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects, files, contacts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] text-sm transition-all"
              />
            </div>
          </div>

          {/* Right — Notifications + User */}
          <div className="flex items-center gap-3">
            <button className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF4D00]" />
            </button>
            <button
              onClick={() => setCustomizeOpen(true)}
              title="Customize dashboard"
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[#FF4D00] transition-colors"
            >
              <SlidersHorizontal size={18} />
              {prefsDirty && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />}
            </button>

            {/* User avatar / menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-gray-900 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-gray-400 leading-tight">{ent.label} plan</p>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      <span
                        className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: "#FF4D00" }}
                      >
                        {ent.label}
                      </span>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Activity size={15} /> My Account
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ════════ MAIN CONTENT ════════ */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8">
        {/* ── Welcome Section ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "#1E3A8A" }}>
              {getGreeting()}, {user.name.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Here&apos;s what&apos;s happening across your projects today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Project selector */}
            <div className="relative">
              <button
                onClick={() => setProjectDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
              >
                <FolderOpen size={15} className="text-gray-400" />
                {selectedProject === "all" ? "All projects" : demoProjects.find((p) => p.id === selectedProject)?.name ?? "All projects"}
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              {projectDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProjectDropdownOpen(false)} />
                  <div className="absolute right-0 top-12 w-60 bg-white rounded-xl border border-gray-100 shadow-xl z-40 overflow-hidden">
                    <button
                      onClick={() => { setSelectedProject("all"); setProjectDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedProject === "all" ? "bg-[#FF4D00]/5 text-[#FF4D00] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                      All projects
                    </button>
                    {demoProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProject(p.id); setProjectDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedProject === p.id ? "bg-[#FF4D00]/5 text-[#FF4D00] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ backgroundColor: "#FF4D00" }}
            >
              <Plus size={15} /> New Project
            </Link>
          </div>
        </div>

        {/* ════════ QUICK ACCESS / TAB NAVIGATION ════════ */}
        {(() => {
          const navItems: Array<{ id: string; label: string; icon: LucideIcon; color: string; isCEOOnly?: boolean }> = [
            { id: "overview", label: "Overview", icon: LayoutDashboard, color: "#1E3A8A" },
            ...visibleTabs,
          ];
          const count = navItems.length;
          const tileW = count <= 7 ? "w-[6.5rem]" : count <= 10 ? "w-[5.5rem]" : "w-[4.75rem]";
          const icoBox = count <= 7 ? "w-11 h-11" : count <= 10 ? "w-10 h-10" : "w-9 h-9";
          const icoSz = count <= 7 ? 20 : count <= 10 ? 18 : 15;
          const lblSz = count <= 7 ? "text-xs" : count <= 10 ? "text-[11px]" : "text-[10px]";
          return (
            <div className="mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Access</p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const isSlatedrop = item.id === "slatedrop";
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isSlatedrop) {
                          openSlateDrop();
                        } else {
                          setActiveTab(item.id);
                        }
                      }}
                      className={`flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl bg-white border transition-all duration-200 group ${tileW} ${
                        isActive
                          ? "border-[#FF4D00] shadow-lg -translate-y-0.5"
                          : "border-gray-100 hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5"
                      } ${item.isCEOOnly ? "ring-1 ring-amber-200" : ""}`}
                    >
                      <div
                        className={`${icoBox} rounded-xl flex items-center justify-center transition-colors`}
                        style={
                          isActive
                            ? { backgroundColor: "#FF4D00", color: "#fff" }
                            : { backgroundColor: `${item.color}1A`, color: item.color }
                        }
                      >
                        <Icon size={icoSz} />
                      </div>
                      <span
                        className={`${lblSz} font-semibold text-center leading-tight transition-colors ${
                          isActive ? "text-[#FF4D00]" : "text-gray-600 group-hover:text-gray-900"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.isCEOOnly && (
                        <span className="text-[8px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full leading-none">
                          CEO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ════════ OVERVIEW TAB CONTENT ════════ */}
        {activeTab === "overview" && (
        <>
        {/* ════════ PROJECT CAROUSEL ════════ */}
        <div className="relative mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Your Projects</h2>
            <div className="flex gap-2">
              <button
                onClick={() => scrollCarousel(-1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollCarousel(1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {demoProjects.map((p) => (
              <Link
                key={p.id}
                href="/dashboard"
                className="group snap-start shrink-0 w-[300px] h-[200px] rounded-2xl overflow-hidden relative border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Background */}
                {p.thumbnail ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url(${p.thumbnail})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                    <span className="text-6xl opacity-30 group-hover:opacity-50 transition-opacity">{projectTypeEmoji(p.type)}</span>
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* Status badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      p.status === "active"
                        ? "bg-emerald-500/90 text-white"
                        : p.status === "completed"
                        ? "bg-blue-500/90 text-white"
                        : "bg-amber-500/90 text-white"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                {/* Type badge */}
                <div className="absolute top-3 left-3">
                  <span className="text-lg">{projectTypeEmoji(p.type)}</span>
                </div>
                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-bold text-base mb-1 group-hover:text-[#FF4D00] transition-colors">{p.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-white/60 flex items-center gap-1"><MapPin size={10} />{p.location}</span>
                    <span className="text-[11px] text-white/40 flex items-center gap-1"><Clock size={10} />{p.lastEdited}</span>
                  </div>
                </div>
              </Link>
            ))}

            {/* + New Project card */}
            <button className="snap-start shrink-0 w-[300px] h-[200px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#FF4D00] flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-[#FF4D00] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white/50">
              <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
                <Plus size={24} />
              </div>
              <span className="text-sm font-semibold">New Project</span>
            </button>
          </div>
        </div>

        {/* ════════ WIDGET GRID (data-driven, respects customization prefs) ════════ */}
        {(() => {
          // Compute which widgets are available for this tier
          const available = new Set<string>([
            ...(ent.canViewSlateDropWidget ? ["slatedrop"] : []),
            "data-usage","processing","financial","calendar","weather","continue","contacts","suggest",
            ...(ent.canManageSeats ? ["seats"] : ["upgrade"]),
          ]);

          function getSpan(id: string, expanded: boolean): string {
            if (id === "seats") return "md:col-span-2 xl:col-span-3";
            if (id === "calendar") return expanded ? "md:col-span-2 xl:col-span-3" : "md:col-span-2 xl:col-span-2";
            return expanded ? "md:col-span-2 xl:col-span-3" : "";
          }

          function renderWidget(id: string, expanded: boolean): React.ReactNode {
            const span = getSpan(id, expanded);
            switch (id) {

              case "slatedrop": return (
          <WidgetCard key={id} icon={FolderOpen} title="SlateDrop" span={span} delay={0} action={
            <button
              onClick={openSlateDrop}
              className="text-[10px] font-semibold text-[#FF4D00] hover:underline flex items-center gap-1"
            >
              Open <ArrowUpRight size={10} />
            </button>
          }>
            <div className="space-y-4">
              {/* Storage bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">Storage used</span>
                  <span className="text-xs font-bold text-gray-900">{storageUsed} GB / {ent.maxStorageGB} GB</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min((storageUsed / ent.maxStorageGB) * 100, 100)}%`,
                      backgroundColor: (storageUsed / ent.maxStorageGB) > 0.85 ? "#EF4444" : "#FF4D00",
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{(ent.maxStorageGB - storageUsed).toFixed(1)} GB available</p>
              </div>
              {/* Recent files placeholder */}
              <div className="space-y-2">
                {["Welcome to SlateDrop.pdf", "Getting Started Guide.pdf", "stadium-model.glb"].map((name, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <FileText size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[11px] text-gray-700 truncate flex-1">{name}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={openSlateDrop}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#FF4D00" }}
              >
                <FolderOpen size={13} /> Open SlateDrop
              </button>
            </div>
          </WidgetCard>
          );

              case "data-usage": return (
          <WidgetCard key={id} icon={CreditCard} title="Data Usage & Credits" span={span} delay={0} action={
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}>
              {ent.label}
            </span>
          }>
            <div className="space-y-5">
              {/* Credits */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">Credits used</span>
                  <span className="text-xs font-bold text-gray-900">{creditsUsed.toLocaleString()} / {ent.maxCredits.toLocaleString()}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min((creditsUsed / ent.maxCredits) * 100, 100)}%`, backgroundColor: "#FF4D00" }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">{(ent.maxCredits - creditsUsed).toLocaleString()} credits remaining this period</p>
              </div>
              {/* Storage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">Storage</span>
                  <span className="text-xs font-bold text-gray-900">{storageUsed} GB / {ent.maxStorageGB} GB</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1E3A8A] transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min((storageUsed / ent.maxStorageGB) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {/* Quick actions */}
              <div className="flex gap-2 pt-1">
                <button className="flex-1 text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Buy credits
                </button>
                <button className="flex-1 text-xs font-semibold py-2 rounded-lg text-white transition-all hover:opacity-90" style={{ backgroundColor: "#FF4D00" }}>
                  Upgrade plan
                </button>
              </div>
            </div>
          </WidgetCard>
          );

              case "processing": return (
          <WidgetCard key={id} icon={Cpu} title="Processing Jobs" span={span} delay={50} action={
            <span className="text-[11px] text-gray-400 font-medium">{demoJobs.filter((j) => j.status === "processing").length} active</span>
          }>
            <div className="space-y-3">
              {demoJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors group">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${statusColor(job.status)}`}>
                    {statusIcon(job.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{job.name}</p>
                    <p className="text-[10px] text-gray-400">{job.type}</p>
                  </div>
                  {job.status === "processing" && (
                    <div className="w-16">
                      <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${job.progress}%`, backgroundColor: "#FF4D00" }}
                        />
                      </div>
                      <p className="text-[9px] text-gray-400 text-right mt-0.5">{job.progress}%</p>
                    </div>
                  )}
                  {job.status === "completed" && (
                    <span className="text-[10px] text-emerald-600 font-medium">Done</span>
                  )}
                  {job.status === "queued" && (
                    <span className="text-[10px] text-gray-400 font-medium">Queued</span>
                  )}
                </div>
              ))}
            </div>
          </WidgetCard>
          );

              case "financial": return (
          <WidgetCard key={id} icon={TrendingUp} title="Financial Snapshot" span={span} delay={100} action={
            <span className="text-[11px] text-gray-400 font-medium">Last 6 months</span>
          }>
            <div className="space-y-4">
              {/* Bar chart */}
              <div className="flex items-end gap-2 h-28">
                {demoFinancial.map((f, i) => (
                  <div key={f.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[9px] text-gray-400 font-medium">{f.credits > 0 ? `${(f.credits / 1000).toFixed(1)}k` : ""}</span>
                    <div className="w-full relative flex items-end justify-center" style={{ height: "80px" }}>
                      <div
                        className="w-full max-w-[32px] rounded-t-md transition-all duration-700 ease-out hover:opacity-80"
                        style={{
                          height: `${(f.credits / financialMax) * 100}%`,
                          backgroundColor: i === demoFinancial.length - 1 ? "#FF4D00" : "#1E3A8A",
                          opacity: i === demoFinancial.length - 1 ? 1 : 0.6,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{f.month}</span>
                  </div>
                ))}
              </div>
              {/* Stats */}
              <div className="flex gap-4 pt-2 border-t border-gray-100">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">This month</p>
                  <p className="text-sm font-bold text-gray-900">1,200 credits</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Avg / month</p>
                  <p className="text-sm font-bold text-gray-900">2,483 credits</p>
                </div>
              </div>
            </div>
          </WidgetCard>
          );

              case "calendar": return (
          <WidgetCard
            key={id}
            icon={CalendarIcon}
            title="Calendar"
            span={span}
            delay={150}
            action={
              <button
                onClick={() => { setAddingEvent(true); if (!calSelected) setCalSelected(todayStr); }}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#FF4D00] hover:underline"
              >
                <Plus size={13} /> Add event
              </button>
            }
          >
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Calendar grid */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-gray-900">{MONTHS[calMonth]} {calYear}</h4>
                  <div className="flex gap-1">
                    <button onClick={prevMonth} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"><ChevronLeft size={14} /></button>
                    <button onClick={nextMonth} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"><ChevronRight size={14} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {DAYS.map((d) => (
                    <div key={d} className="text-center text-[10px] text-gray-400 font-semibold py-2">{d}</div>
                  ))}
                  {calDays.map((cell, i) => {
                    const hasEvents = events.some((e) => e.date === cell.dateStr);
                    const isToday = cell.dateStr === todayStr;
                    const isSelected = cell.dateStr === calSelected;
                    return (
                      <button
                        key={i}
                        onClick={() => setCalSelected(cell.dateStr)}
                        className={`relative h-9 rounded-lg text-xs font-medium transition-all
                          ${!cell.inMonth ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"}
                          ${isToday && !isSelected ? "bg-[#FF4D00]/10 text-[#FF4D00] font-bold" : ""}
                          ${isSelected ? "bg-[#FF4D00] text-white font-bold shadow-sm" : ""}
                        `}
                      >
                        {cell.day}
                        {hasEvents && !isSelected && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF4D00]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Events sidebar */}
              <div className="lg:w-64 lg:border-l lg:border-gray-100 lg:pl-6">
                <h4 className="text-xs font-bold text-gray-900 mb-3">
                  {calSelected ? new Date(calSelected + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "Upcoming events"}
                </h4>

                {/* Add event form */}
                {addingEvent && calSelected && (
                  <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <input
                      type="text"
                      placeholder="Event title…"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] mb-2"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={handleAddEvent} className="flex-1 text-xs font-semibold py-2 rounded-lg text-white" style={{ backgroundColor: "#FF4D00" }}>Add</button>
                      <button onClick={() => setAddingEvent(false)} className="flex-1 text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Event list */}
                <div className="space-y-2.5 max-h-[240px] overflow-y-auto">
                  {(calSelected ? selectedDayEvents : events.slice(0, 5)).map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ev.color }} />
                      <div>
                        <p className="text-xs font-semibold text-gray-900 leading-snug">{ev.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {ev.project && ` · ${ev.project}`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {calSelected && selectedDayEvents.length === 0 && !addingEvent && (
                    <p className="text-xs text-gray-400 py-4 text-center">No events this day</p>
                  )}
                </div>
              </div>
            </div>
          </WidgetCard>
          );

              case "weather": return (
          <WidgetCard key={id} icon={Cloud} title="Weather" span={span} delay={200} action={
            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1"><MapPin size={10} />{demoWeather.location}</span>
          }>
            <div className="space-y-4">
              {/* Current */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center mb-1">
                    <CloudSun size={28} className="text-amber-500" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">{demoWeather.current.temp}°<span className="text-base font-normal text-gray-400">F</span></p>
                  <p className="text-xs text-gray-500">{demoWeather.current.condition}</p>
                </div>
                <div className="ml-auto text-right space-y-1">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end"><Droplets size={10} />{demoWeather.current.humidity}%</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end"><Wind size={10} />{demoWeather.current.wind} mph</p>
                </div>
              </div>

              {/* 5-day forecast */}
              <div className="grid grid-cols-5 gap-1.5">
                {demoWeather.forecast.map((f) => (
                  <div key={f.day} className="text-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <p className="text-[10px] text-gray-500 font-semibold mb-1">{f.day}</p>
                    {weatherIcon(f.icon)}
                    <p className="text-[10px] font-bold text-gray-900 mt-1">{f.hi}°</p>
                    <p className="text-[9px] text-gray-400">{f.lo}°</p>
                    {f.precip >= 40 && (
                      <p className="text-[9px] text-blue-500 font-medium mt-0.5">{f.precip}%💧</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Construction alerts */}
              <div className="space-y-1.5">
                {demoWeather.constructionAlerts.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${
                      a.severity === "warning"
                        ? "bg-amber-50 text-amber-700"
                        : a.severity === "caution"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{a.message}</span>
                  </div>
                ))}
              </div>

              {/* Log to daily report */}
              <button
                onClick={() => setWeatherLogged(true)}
                disabled={weatherLogged}
                className="w-full text-xs font-semibold py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {weatherLogged ? <><CheckCircle2 size={13} className="text-emerald-500" /> Logged to daily report</> : <><Send size={12} /> Log to Daily Report</>}
              </button>
            </div>
          </WidgetCard>
          );

              case "continue": return (
          <WidgetCard key={id} icon={Clock} title="Continue Working" span={span} delay={250} action={
            <Link href="/dashboard" className="text-[11px] font-semibold text-[#FF4D00] hover:underline flex items-center gap-0.5">
              View all <ArrowRight size={11} />
            </Link>
          }>
            <div className="space-y-2">
              {demoContinueWorking.map((item, i) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:text-[#FF4D00] transition-colors">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-[#FF4D00] transition-colors">{item.title}</p>
                      <p className="text-[10px] text-gray-400 truncate">{item.subtitle}</p>
                    </div>
                    <span className="text-[10px] text-gray-300 shrink-0">{item.time}</span>
                  </Link>
                );
              })}
            </div>
          </WidgetCard>
          );

              case "contacts": return (
          <WidgetCard key={id} icon={Users} title="Contacts" span={span} delay={300} action={
            <button className="text-[11px] font-semibold text-[#FF4D00] hover:underline flex items-center gap-0.5">
              <UserPlus size={12} /> Add
            </button>
          }>
            <div className="space-y-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
                />
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {filteredContacts.map((c) => (
                  <button
                    key={c.name}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{c.role}</p>
                    </div>
                    <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{c.project}</span>
                  </button>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No contacts found</p>
                )}
              </div>
            </div>
          </WidgetCard>
          );

              case "suggest": return (
          <WidgetCard key={id} icon={Lightbulb} title="Suggest a Feature" span={span} delay={350}>
            {suggestDone ? (
              <div className="text-center py-6">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
                <p className="text-sm font-semibold text-gray-900 mb-1">Thank you!</p>
                <p className="text-xs text-gray-400">Your suggestion has been sent to our team.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Title</label>
                  <input
                    type="text"
                    placeholder="What feature would you like?"
                    value={suggestTitle}
                    onChange={(e) => setSuggestTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    placeholder="Tell us more about what you need…"
                    value={suggestDesc}
                    onChange={(e) => setSuggestDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSuggestPriority(p)}
                        className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all capitalize ${
                          suggestPriority === p
                            ? "border-[#FF4D00] bg-[#FF4D00]/5 text-[#FF4D00]"
                            : "border-gray-200 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSuggestFeature}
                  disabled={suggestLoading || !suggestTitle.trim() || !suggestDesc.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  {suggestLoading ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Submit suggestion</>}
                </button>
              </div>
            )}
          </WidgetCard>
          );

              case "seats": return (
            <WidgetCard
              key={id}
              icon={Users}
              title="Seat Management"
              span={span}
              delay={400}
              action={
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: "#FF4D00" }}>
                  <UserPlus size={13} /> Invite member
                </button>
              }
            >
              <div>
                <div className="flex items-center gap-6 mb-5">
                  <div>
                    <p className="text-2xl font-black text-gray-900">{demoSeatMembers.length}</p>
                    <p className="text-[10px] text-gray-400 font-medium">of {ent.maxSeats} seats used</p>
                  </div>
                  <div className="h-10 w-px bg-gray-100" />
                  <div>
                    <p className="text-2xl font-black text-emerald-600">{demoSeatMembers.filter((m) => m.active).length}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Active now</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Name</th>
                        <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Email</th>
                        <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">Role</th>
                        <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demoSeatMembers.map((m, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 pr-4 text-xs font-semibold text-gray-900">{m.name}</td>
                          <td className="py-3 pr-4 text-xs text-gray-500">{m.email}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              m.role === "Owner" ? "bg-[#FF4D00]/10 text-[#FF4D00]" : m.role === "Admin" ? "bg-[#1E3A8A]/10 text-[#1E3A8A]" : "bg-gray-100 text-gray-600"
                            }`}>{m.role}</span>
                          </td>
                          <td className="py-3">
                            <span className={`flex items-center gap-1.5 text-[10px] font-medium ${m.active ? "text-emerald-600" : "text-gray-400"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${m.active ? "bg-emerald-500" : "bg-gray-300"}`} />
                              {m.active ? "Online" : "Offline"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </WidgetCard>
          );

              case "upgrade": return (
            <WidgetCard key={id} icon={Zap} title="Unlock more power" span={span} delay={400}>
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#FF4D001A" }}>
                  <Zap size={24} style={{ color: "#FF4D00" }} />
                </div>
                <p className="text-sm font-bold text-gray-900 mb-2">Upgrade to Business</p>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Get seat management, Project Hub, advanced analytics, and 30,000 credits per month.
                </p>
                <Link
                  href="/plans"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  View plans <ArrowRight size={13} />
                </Link>
              </div>
            </WidgetCard>
          );

              default: return null;
            }
          }

          const orderedVisible = [...widgetPrefs]
            .filter((p) => p.visible && available.has(p.id))
            .sort((a, b) => a.order - b.order);

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {orderedVisible.map((p) => renderWidget(p.id, p.expanded))}
            </div>
          );
        })()}

        </>
        )}

        {/* ════════ SPECIFIC TAB WIREFRAME ════════ */}
        {activeTab !== "overview" && (() => {
          const tab = visibleTabs.find((t) => t.id === activeTab);
          if (!tab) return null;
          return <TabWireframe tab={tab} onBack={() => setActiveTab("overview")} onOpenSlateDrop={openSlateDrop} />;
        })()}
      </main>

      {/* ════════ CUSTOMIZE PANEL (right-side drawer) ════════ */}
      {customizeOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={() => setCustomizeOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-black text-gray-900">Customize Dashboard</h2>
                <p className="text-xs text-gray-400 mt-0.5">Reorder, show or hide, and resize widgets</p>
              </div>
              <button onClick={() => setCustomizeOpen(false)} className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors">
                <XCircle size={18} />
              </button>
            </div>

            {/* Widget list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {[...widgetPrefs].sort((a, b) => a.order - b.order).map((pref) => {
                const meta = WIDGET_META.find((m) => m.id === pref.id);
                if (!meta) return null;
                // Hide tier-gated widgets the user can't access
                if (meta.id === "seats" && !ent.canManageSeats) return null;
                if (meta.id === "upgrade" && ent.canManageSeats) return null;
                const Icon = meta.icon;
                const pos = [...widgetPrefs].sort((a, b) => a.order - b.order).findIndex((p) => p.id === pref.id);
                const total = widgetPrefs.length;
                return (
                  <div
                    key={pref.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      pref.visible ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
                    }`}
                  >
                    {/* Drag handle / order controls */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveWidget(pref.id, -1)}
                        disabled={pos === 0}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveWidget(pref.id, 1)}
                        disabled={pos >= total - 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                      <Icon size={15} />
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{meta.label}</p>
                      <p className="text-[10px] text-gray-400">{pref.expanded ? "Full width" : "Normal"}</p>
                    </div>

                    {/* Expanded toggle */}
                    <button
                      onClick={() => toggleExpanded(pref.id)}
                      title={pref.expanded ? "Shrink to normal" : "Expand to full width"}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        pref.expanded ? "bg-[#1E3A8A]/10 text-[#1E3A8A]" : "text-gray-300 hover:text-gray-500"
                      }`}
                    >
                      {pref.expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>

                    {/* Visible toggle */}
                    <button
                      onClick={() => toggleVisible(pref.id)}
                      title={pref.visible ? "Hide widget" : "Show widget"}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        pref.visible ? "bg-[#FF4D00]/10 text-[#FF4D00]" : "text-gray-300 hover:text-gray-500"
                      }`}
                    >
                      {pref.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 space-y-2">
              {prefsDirty && (
                <p className="text-[10px] text-amber-600 text-center font-medium">You have unsaved changes</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={resetPrefs}
                  className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Reset to default
                </button>
                <button
                  onClick={async () => { await savePrefs(); setCustomizeOpen(false); }}
                  disabled={prefsSaving || !prefsDirty}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  {prefsSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  {prefsSaving ? "Saving…" : "Save layout"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════ SLATEDROP FLOATING WINDOW ════════ */}
      {slateDropOpen && (
        <div
          className="fixed z-[9999] flex flex-col rounded-2xl overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.55)] border border-gray-700/70"
          style={{ left: sdPos.x, top: sdPos.y, width: sdSize.w, height: sdMinimized ? "auto" : sdSize.h }}
        >
          {/* ── Title bar / drag handle ── */}
          <div
            className="flex items-center gap-3 px-4 h-11 bg-gray-900 select-none shrink-0 cursor-grab active:cursor-grabbing"
            onPointerDown={onSdTitleDown}
            onPointerMove={onSdPointerMove}
            onPointerUp={onSdPointerUp}
          >
            {/* Traffic-light buttons */}
            <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSlateDropOpen(false)}
                className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group transition-colors"
                title="Close"
              >
                <X size={7} className="text-red-900 opacity-0 group-hover:opacity-100" />
              </button>
              <button
                onClick={() => setSdMinimized((v) => !v)}
                className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-300 transition-colors"
                title={sdMinimized ? "Restore" : "Minimise"}
              />
              <button
                onClick={() => { setSdSize({ w: window.innerWidth - 32, h: window.innerHeight - 32 }); setSdPos({ x: 16, y: 16 }); setSdMinimized(false); }}
                className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
                title="Maximise"
              />
            </div>
            <FolderOpen size={14} className="text-[#FF4D00] ml-1 shrink-0" />
            <span className="text-[13px] font-semibold text-white/90 flex-1 text-center -ml-8 pointer-events-none">SlateDrop</span>
          </div>

          {/* ── iframe body ── */}
          {!sdMinimized && (
            <iframe
              src="/slatedrop"
              className="flex-1 border-0 bg-white block"
              title="SlateDrop"
              allow="fullscreen"
            />
          )}

          {/* ── Resize handle (bottom-right corner) ── */}
          {!sdMinimized && (
            <div
              className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
              style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.18) 50%)" }}
              onPointerDown={onSdResizeDown}
              onPointerMove={onSdPointerMove}
              onPointerUp={onSdPointerUp}
            />
          )}
        </div>
      )}
    </div>
  );
}
