"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import SlateDropClient from "@/components/slatedrop/SlateDropClient";
import MarketClient from "@/components/dashboard/MarketClient";
import LocationMap from "./LocationMap";
import WidgetCard from "@/components/widgets/WidgetCard";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import {
  WIDGET_META,
  type WidgetPref,
  type WidgetMeta,
  type WidgetSize,
  getWidgetSpan,
  buildDefaultPrefs,
  DASHBOARD_STORAGE_KEY,
} from "@/components/widgets/widget-meta";
import {
  loadWidgetPrefs,
  mergeWidgetPrefs,
  saveWidgetPrefs,
  WIDGET_PREFS_SCHEMA_VERSION,
} from "@/components/widgets/widget-prefs-storage";
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
  FolderOpen, FolderKanban,
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
  Home,
  Plug,
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

interface LiveWeatherState {
  location: string;
  current: {
    temp: number;
    condition: string;
    humidity: number;
    wind: number;
    icon: "sun" | "cloud-sun" | "cloud" | "rain" | "snow";
  };
  forecast: Array<{
    day: string;
    hi: number;
    lo: number;
    icon: "sun" | "cloud-sun" | "cloud" | "rain" | "snow";
    precip: number;
  }>;
  constructionAlerts: Array<{
    message: string;
    severity: "warning" | "caution" | "info";
  }>;
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

// WidgetPref — imported from @/components/widgets/widget-meta

interface AccountOverview {
  profile: {
    name: string;
    email: string;
    orgName: string;
    role: string;
  };
  billing: {
    plan: string;
    tier: Tier;
    status: "active" | "trialing" | "past_due" | "canceled";
    renewsOn: string | null;
    purchasedCredits: number;
    totalCreditsBalance: number;
  };
  usage: {
    storageUsedGb: number;
    storageLimitGb: number;
    monthlyCredits: number;
    projectsCount: number;
    modelsCount: number;
    toursCount: number;
    docsCount: number;
  };
  sessions: Array<{ id: string; device: string; ip: string; lastActive: string }>;
  auditLog: Array<{ id: string; action: string; actor: string; createdAt: string }>;
  apiKeys: Array<{ id: string; label: string; lastFour: string; createdAt: string }>;
  isAdmin: boolean;
}

interface DashboardWidgetsPayload {
  projects: Project[];
  jobs: Job[];
  financial: Array<{ month: string; credits: number }>;
  continueWorking: Array<{
    title: string;
    subtitle: string;
    time: string;
    kind: "design" | "tour" | "rfi" | "report" | "file";
    href: string;
  }>;
  seats: Array<{ name: string; role: string; email: string; active: boolean }>;
}

type InboxNotification = {
  id: string;
  project_id: string;
  title: string;
  message: string;
  link_path?: string | null;
  created_at: string;
};

type SlateDropFolderQuickView = {
  name: string;
  description: string;
};

/* ================================================================
   WIDGET META — imported from @/components/widgets/widget-meta
   ================================================================ */

const DEFAULT_WIDGET_PREFS: WidgetPref[] = buildDefaultPrefs({ expandedIds: ["calendar", "seats"] });

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

/* ════════════════════════════════════════════════════════════════
   WIDGET CARD — imported from @/components/widgets/WidgetCard
   ════════════════════════════════════════════════════════════════ */

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
    "integrations":   "Connect external systems, map data syncs, and monitor integration health.",
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
        <ChevronLeft size={13} /> Back to Dashboard
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
  const router = useRouter();

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
    { id: "slatedrop",      label: "SlateDrop",      icon: FolderOpen, FolderKanban,      color: "#FF4D00" },
    { id: "my-account",     label: "My Account",     icon: User,            color: "#1E3A8A" },
    ...(isCEO ? ([
      { id: "ceo",        label: "CEO",        icon: Shield,      color: "#FF4D00", isCEOOnly: true },
      { id: "market",     label: "Market Robot", icon: TrendingUp,  color: "#1E3A8A", isCEOOnly: true },
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
  const [events, setEvents] = useState<CalEvent[]>([]);
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
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(() => loadWidgetPrefs(DASHBOARD_STORAGE_KEY, DEFAULT_WIDGET_PREFS));
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [dashDragIdx, setDashDragIdx] = useState<number | null>(null);
  const [billingBusy, setBillingBusy] = useState<"portal" | "credits" | "upgrade" | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingNotice, setBillingNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [accountOverview, setAccountOverview] = useState<AccountOverview | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [apiKeyLabel, setApiKeyLabel] = useState("");
  const [apiKeyBusy, setApiKeyBusy] = useState<"create" | string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [prefTheme, setPrefTheme] = useState<"light" | "dark" | "system">("system");
  const [prefStartTab, setPrefStartTab] = useState("overview");
  const [prefNotification, setPrefNotification] = useState<"off" | "daily" | "weekly">("daily");
  const [prefImportantAlerts, setPrefImportantAlerts] = useState(true);
  const [prefShowDashboardTiles, setPrefShowDashboardTiles] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<InboxNotification[]>([]);

  // ── SlateDrop floating window ───────────────────────────────
  const [slateDropOpen, setSlateDropOpen] = useState(false);
  const [sdMinimized, setSdMinimized] = useState(false);
  const [sdPos, setSdPos] = useState({ x: 0, y: 0 });
  const [sdSize, setSdSize] = useState({ w: 1000, h: 680 });
  const [sdIsMobile, setSdIsMobile] = useState(false);
  const sdDragMode = useRef<"title" | "resize" | null>(null);
  const sdDragStart = useRef({ clientX: 0, clientY: 0, startX: 0, startY: 0, startW: 0, startH: 0 });

  const [widgetPopoutId, setWidgetPopoutId] = useState<string | null>(null);
  const [wdMinimized, setWdMinimized] = useState(false);
  const [wdPos, setWdPos] = useState({ x: 0, y: 0 });
  const [wdSize, setWdSize] = useState({ w: 900, h: 640 });
  const [wdIsMobile, setWdIsMobile] = useState(false);
  const wdDragMode = useRef<"title" | "resize" | null>(null);
  const wdDragStart = useRef({ clientX: 0, clientY: 0, startX: 0, startY: 0, startW: 0, startH: 0 });

  function openSlateDrop() {
    const isMobile = window.innerWidth < 768;
    setSdIsMobile(isMobile);
    if (isMobile) {
      setSdPos({ x: 0, y: 0 });
      setSdSize({ w: window.innerWidth, h: window.innerHeight });
      setSdMinimized(false);
      setSlateDropOpen(true);
      return;
    }
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

  const loadUnreadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUnreadNotifications([]);
        return;
      }

      const { data } = await supabase
        .from("project_notifications")
        .select("id, project_id, title, message, link_path, created_at")
        .eq("user_id", authUser.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      setUnreadNotifications((data ?? []) as InboxNotification[]);
    } catch {
      setUnreadNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!notificationsOpen) return;
    void loadUnreadNotifications();
  }, [notificationsOpen, loadUnreadNotifications]);

  function openWidgetPopout(widgetId: string) {
    const isMobile = window.innerWidth < 768;
    setWdIsMobile(isMobile);
    if (isMobile) {
      setWdPos({ x: 0, y: 0 });
      setWdSize({ w: window.innerWidth, h: window.innerHeight });
      setWdMinimized(false);
      setWidgetPopoutId(widgetId);
      return;
    }

    setWdPos({
      x: Math.max(0, (window.innerWidth - 900) / 2),
      y: Math.max(10, (window.innerHeight - 640) / 4),
    });
    setWdSize({ w: 900, h: 640 });
    setWdMinimized(false);
    setWidgetPopoutId(widgetId);
  }

  function onWdTitleDown(e: React.PointerEvent) {
    wdDragMode.current = "title";
    wdDragStart.current = { clientX: e.clientX, clientY: e.clientY, startX: wdPos.x, startY: wdPos.y, startW: wdSize.w, startH: wdSize.h };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onWdResizeDown(e: React.PointerEvent) {
    wdDragMode.current = "resize";
    wdDragStart.current = { clientX: e.clientX, clientY: e.clientY, startX: wdPos.x, startY: wdPos.y, startW: wdSize.w, startH: wdSize.h };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }
  function onWdPointerMove(e: React.PointerEvent) {
    if (!wdDragMode.current) return;
    const dx = e.clientX - wdDragStart.current.clientX;
    const dy = e.clientY - wdDragStart.current.clientY;
    if (wdDragMode.current === "title") {
      setWdPos({ x: wdDragStart.current.startX + dx, y: wdDragStart.current.startY + dy });
    } else {
      setWdSize({ w: Math.max(560, wdDragStart.current.startW + dx), h: Math.max(420, wdDragStart.current.startH + dy) });
    }
  }
  function onWdPointerUp() { wdDragMode.current = null; }

  const [dashboardSummary, setDashboardSummary] = useState<{ recentFiles: any[]; storageUsed: number } | null>(null);
  const [slateDropFiles, setSlateDropFiles] = useState<any[]>([]);
  const [slateDropWidgetView, setSlateDropWidgetView] = useState<"recent" | "folders">("folders");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherState | null>(null);
  const [widgetsData, setWidgetsData] = useState<DashboardWidgetsPayload | null>(null);

  /* ── Load saved prefs from Supabase user metadata on mount ─── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      const saved = u?.user_metadata?.dashboardWidgets as WidgetPref[] | undefined;
      const savedVersion = Number(u?.user_metadata?.dashboardWidgetsVersion ?? 0);
      if (savedVersion === WIDGET_PREFS_SCHEMA_VERSION && saved && Array.isArray(saved) && saved.length > 0) {
        const merged = mergeWidgetPrefs(DEFAULT_WIDGET_PREFS, saved);
        setWidgetPrefs(merged);
        saveWidgetPrefs(DASHBOARD_STORAGE_KEY, merged);
      }
    });

    // Fetch dashboard summary
    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setDashboardSummary(data);
      })
      .catch(console.error);

    // Fetch SlateDrop files
    fetch("/api/slatedrop/files?folderId=general")
      .then((res) => res.json())
      .then((data) => {
        if (data.files) setSlateDropFiles(data.files);
      })
      .catch(console.error);

    // Fetch account overview for quotas
    fetch("/api/account/overview")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setAccountOverview(data);
      })
      .catch(console.error);

    // Fetch live widget datasets
    fetch("/api/dashboard/widgets", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setWidgetsData({
            projects: Array.isArray(data.projects) ? data.projects : [],
            jobs: Array.isArray(data.jobs) ? data.jobs : [],
            financial: Array.isArray(data.financial) ? data.financial : [],
            continueWorking: Array.isArray(data.continueWorking) ? data.continueWorking : [],
            seats: Array.isArray(data.seats) ? data.seats : [],
          });
        }
      })
      .catch(console.error);
  }, [supabase]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`dashboard_events_${user.email}`);
      if (saved) {
        const parsed = JSON.parse(saved) as CalEvent[];
        if (Array.isArray(parsed)) setEvents(parsed);
      }
    } catch {
      // ignore malformed saved events
    }
  }, [user.email]);

  useEffect(() => {
    localStorage.setItem(`dashboard_events_${user.email}`, JSON.stringify(events));
  }, [events, user.email]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });

        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=5&timezone=auto`),
            fetch(`/api/weather/reverse-geocode?lat=${lat}&lng=${lng}`),
          ]);

          if (!weatherRes.ok) return;

          const weatherJson = await weatherRes.json();
          const geoJson = geoRes.ok ? await geoRes.json() : null;

          const weatherCodeToIcon = (code: number): "sun" | "cloud-sun" | "cloud" | "rain" | "snow" => {
            if ([0].includes(code)) return "sun";
            if ([1, 2].includes(code)) return "cloud-sun";
            if ([3, 45, 48].includes(code)) return "cloud";
            if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
            return "rain";
          };

          const weatherCodeToCondition = (code: number): string => {
            if (code === 0) return "Clear";
            if ([1, 2].includes(code)) return "Partly Cloudy";
            if ([3, 45, 48].includes(code)) return "Cloudy";
            if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
            return "Rain";
          };

          const dailyCodes = weatherJson?.daily?.weather_code ?? [];
          const dailyMax = weatherJson?.daily?.temperature_2m_max ?? [];
          const dailyMin = weatherJson?.daily?.temperature_2m_min ?? [];
          const dailyPrecip = weatherJson?.daily?.precipitation_probability_max ?? [];

          const forecast = (weatherJson?.daily?.time ?? []).slice(0, 5).map((dateStr: string, index: number) => {
            const day = new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
            return {
              day,
              hi: Math.round(Number(dailyMax[index] ?? 0) * 9 / 5 + 32),
              lo: Math.round(Number(dailyMin[index] ?? 0) * 9 / 5 + 32),
              icon: weatherCodeToIcon(Number(dailyCodes[index] ?? 1)),
              precip: Number(dailyPrecip[index] ?? 0),
            };
          });

          const locationName = geoJson?.results?.[0]
            ? `${geoJson.results[0].name}${geoJson.results[0].admin1 ? `, ${geoJson.results[0].admin1}` : ""}`
            : `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

          const currentCode = Number(weatherJson?.current?.weather_code ?? 1);
          const humidity = Number(weatherJson?.current?.relative_humidity_2m ?? 0);
          const windMph = Number(weatherJson?.current?.wind_speed_10m ?? 0) * 0.621371;

          const alerts: LiveWeatherState["constructionAlerts"] = [];
          if (windMph >= 20) alerts.push({ message: `High wind risk (${Math.round(windMph)} mph) — review crane operations`, severity: "warning" });
          if (forecast.some((f: { precip: number }) => f.precip >= 50)) alerts.push({ message: "High precipitation chance in the next 5 days — protect exposed work areas", severity: "caution" });
          if (alerts.length === 0) alerts.push({ message: "No major weather construction risks detected", severity: "info" });

          setLiveWeather({
            location: locationName,
            current: {
              temp: Math.round(Number(weatherJson?.current?.temperature_2m ?? 0) * 9 / 5 + 32),
              condition: weatherCodeToCondition(currentCode),
              humidity,
              wind: Math.round(windMph),
              icon: weatherCodeToIcon(currentCode),
            },
            forecast,
            constructionAlerts: alerts,
          });
        } catch {
          // fail quietly; widget will use fallback
        }
      },
      () => {
        // location denied / unavailable
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "success") {
      setBillingNotice({ ok: true, text: "Subscription updated successfully." });
    } else if (params.get("billing") === "cancelled") {
      setBillingNotice({ ok: false, text: "Checkout was cancelled." });
    } else if (params.get("credits") === "success") {
      setBillingNotice({ ok: true, text: "Credit purchase completed successfully." });
    } else if (params.get("credits") === "cancelled") {
      setBillingNotice({ ok: false, text: "Credit checkout was cancelled." });
    }
  }, []);

  const carouselRef = useRef<HTMLDivElement>(null);

  /* ── Derived ── */
  const calDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const liveContacts = useMemo(() => {
    const seeded: Contact[] = [
      {
        name: user.name,
        role: "Account Owner",
        project: accountOverview?.profile.orgName ?? "Organization",
        initials: user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        color: "#1E3A8A",
      },
      ...((accountOverview?.sessions ?? []).slice(0, 6).map((session, index) => ({
        name: session.device,
        role: "Active Session",
        project: "Current Workspace",
        initials: `S${index + 1}`,
        color: "#FF4D00",
      }))),
    ];

    return seeded;
  }, [user.name, accountOverview?.profile.orgName, accountOverview?.sessions]);

  const filteredContacts = useMemo(
    () =>
      liveContacts.filter(
        (c) =>
          c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.project.toLowerCase().includes(contactSearch.toLowerCase())
      ),
    [contactSearch, liveContacts]
  );

  const selectedDayEvents = useMemo(
    () => (calSelected ? events.filter((e) => e.date === calSelected) : []),
    [calSelected, events]
  );

  const liveProjects = widgetsData?.projects ?? [];
  const liveJobs = widgetsData?.jobs ?? [];
  const liveFinancial = widgetsData?.financial ?? [];
  const liveContinueWorking = widgetsData?.continueWorking ?? [];
  const liveSeatMembers = widgetsData?.seats ?? [];

  const creditsUsed = accountOverview?.billing?.purchasedCredits ?? 0;
  const storageUsed = dashboardSummary ? Number((dashboardSummary.storageUsed / (1024 * 1024 * 1024)).toFixed(2)) : (ent.tier === "trial" ? 1.2 : ent.tier === "creator" ? 12 : 45);
  const slateDropFolderQuickView: SlateDropFolderQuickView[] = useMemo(() => {
    const base: SlateDropFolderQuickView[] = [
      { name: "Project Sandbox", description: "Shared cross-module workspace" },
    ];

    if (["model", "business", "enterprise"].includes(ent.tier)) {
      base.push({ name: "Design Studio", description: "Models, plans, and redlines" });
      base.push({ name: "Geospatial", description: "Drone, GIS, and point clouds" });
      base.push({ name: "Virtual Studio", description: "Simulation and immersive assets" });
    }

    if (["creator", "model", "business", "enterprise"].includes(ent.tier)) {
      base.push({ name: "Content Studio", description: "Media, exports, and brand assets" });
      base.push({ name: "360 Tours", description: "Tour captures and annotations" });
    }

    if (["business", "enterprise"].includes(ent.tier)) {
      base.push({ name: "Project Hub", description: "RFIs, submittals, reports, photos" });
      base.push({ name: "Analytics", description: "Dashboards, snapshots, and exports" });
    }

    return base;
  }, [ent.tier]);

  /* ── Handlers ── */
  const scrollCarousel = useCallback((dir: number) => {
    carouselRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [supabase]);

  const launchBillingFlow = useCallback(async (endpoint: string, body?: Record<string, unknown>) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      throw new Error(data?.error ?? "Unable to open billing flow");
    }
    window.location.href = data.url;
  }, []);

  const handleOpenBillingPortal = useCallback(async () => {
    setBillingError(null);
    setBillingBusy("portal");
    try {
      await launchBillingFlow("/api/billing/portal");
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to open billing portal");
      setBillingBusy(null);
    }
  }, [launchBillingFlow]);

  const handleBuyCredits = useCallback(async () => {
    setBillingError(null);
    setBillingBusy("credits");
    try {
      await launchBillingFlow("/api/billing/credits/checkout", { packId: "starter" });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to start credit checkout");
      setBillingBusy(null);
    }
  }, [launchBillingFlow]);

  const handleUpgradePlan = useCallback(async () => {
    setBillingError(null);
    setBillingBusy("upgrade");
    try {
      const tier = ent.tier === "trial" ? "creator" : ent.tier === "creator" ? "model" : "business";
      await launchBillingFlow("/api/billing/checkout", {
        tier,
        billingCycle: "monthly",
      });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to start upgrade checkout");
      setBillingBusy(null);
    }
  }, [ent.tier, launchBillingFlow]);

  const loadAccountOverview = useCallback(async () => {
    setAccountLoading(true);
    setAccountError(null);
    try {
      const res = await fetch("/api/account/overview", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Unable to load account data");
      }
      setAccountOverview(data as AccountOverview);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Unable to load account data");
    } finally {
      setAccountLoading(false);
    }
  }, []);

  const copyText = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setBillingNotice({ ok: true, text: `${label} copied` });
      setTimeout(() => setBillingNotice(null), 2500);
    } catch {
      setBillingNotice({ ok: false, text: `Unable to copy ${label.toLowerCase()}` });
      setTimeout(() => setBillingNotice(null), 2500);
    }
  }, []);

  const applyLayoutPreset = useCallback(async (preset: "simple" | "creator" | "project") => {
    const mappedTab = preset === "creator" ? "content-studio" : preset === "project" ? "project-hub" : "overview";
    try {
      await supabase.auth.updateUser({
        data: {
          dashboardPreset: preset,
          defaultTab: mappedTab,
        },
      });
      setBillingNotice({ ok: true, text: `${preset.charAt(0).toUpperCase() + preset.slice(1)} view saved.` });
    } catch {
      setBillingNotice({ ok: false, text: "Could not save preset" });
    }
  }, [supabase]);

  const handleGenerateApiKey = useCallback(async () => {
    setApiKeyError(null);
    setGeneratedApiKey(null);
    setApiKeyBusy("create");
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: apiKeyLabel.trim() || "General Key" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to create API key");
      }
      setGeneratedApiKey(data?.key?.raw ?? null);
      setApiKeyLabel("");
      await loadAccountOverview();
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to create API key");
    } finally {
      setApiKeyBusy(null);
    }
  }, [apiKeyLabel, loadAccountOverview]);

  const handleRevokeApiKey = useCallback(async (id: string) => {
    setApiKeyError(null);
    setApiKeyBusy(id);
    try {
      const res = await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to revoke API key");
      }
      await loadAccountOverview();
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to revoke API key");
    } finally {
      setApiKeyBusy(null);
    }
  }, [loadAccountOverview]);

  const saveAccountPreferences = useCallback(async () => {
    try {
      await supabase.auth.updateUser({
        data: {
          theme: prefTheme,
          defaultTab: prefStartTab,
          notificationFrequency: prefNotification,
          importantAlerts: prefImportantAlerts,
          showDashboardTiles: prefShowDashboardTiles,
        },
      });
      setBillingNotice({ ok: true, text: "Preferences saved." });
      setTimeout(() => setBillingNotice(null), 2200);
    } catch {
      setBillingNotice({ ok: false, text: "Could not save preferences" });
      setTimeout(() => setBillingNotice(null), 2200);
    }
  }, [supabase, prefTheme, prefStartTab, prefNotification, prefImportantAlerts, prefShowDashboardTiles]);

  useEffect(() => {
    if (activeTab === "my-account") {
      void loadAccountOverview();
    }
  }, [activeTab, loadAccountOverview]);

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
    setWidgetPrefs((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, visible: !p.visible } : p);
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setPrefsDirty(true);
  }, []);
  const setWidgetSize = useCallback((id: string, newSize: WidgetSize) => {
    setWidgetPrefs((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, size: newSize } : p);
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
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
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, newArr);
      return newArr;
    });
    setPrefsDirty(true);
  }, []);
  const savePrefs = useCallback(async () => {
    setPrefsSaving(true);
    try {
      await supabase.auth.updateUser({
        data: {
          dashboardWidgets: widgetPrefs,
          dashboardWidgetsVersion: WIDGET_PREFS_SCHEMA_VERSION,
        },
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, widgetPrefs);
      setPrefsDirty(false);
    } finally {
      setPrefsSaving(false);
    }
  }, [supabase, widgetPrefs]);
  const resetPrefs = useCallback(() => {
    setWidgetPrefs(DEFAULT_WIDGET_PREFS);
    saveWidgetPrefs(DASHBOARD_STORAGE_KEY, DEFAULT_WIDGET_PREFS);
    setPrefsDirty(true);
  }, []);

  /* ── Drag-and-drop reorder helpers for dashboard widget grid ── */
  const handleDashDragStart = useCallback((idx: number) => setDashDragIdx(idx), []);
  const handleDashDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dashDragIdx === null || dashDragIdx === idx) return;
    setWidgetPrefs((prev) => {
      const vis = [...prev].filter((p) => p.visible).sort((a, b) => a.order - b.order);
      const visIds = vis.map((p) => p.id);
      const [moved] = visIds.splice(dashDragIdx, 1);
      visIds.splice(idx, 0, moved);
      const next = prev.map((p) => {
        const visIdx = visIds.indexOf(p.id);
        return visIdx >= 0 ? { ...p, order: visIdx } : p;
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setDashDragIdx(idx);
    setPrefsDirty(true);
  }, [dashDragIdx]);
  const handleDashDragEnd = useCallback(() => setDashDragIdx(null), []);

  /* ── Tier-filtered meta for customization drawer ── */
  const drawerMeta = useMemo(() => {
    return WIDGET_META.filter((m) => {
      if (m.id === "seats" && !ent.canManageSeats) return false;
      if (m.id === "upgrade" && ent.canManageSeats) return false;
      return true;
    });
  }, [ent.canManageSeats]);

  const financialMax = Math.max(1, ...liveFinancial.map((f) => f.credits));

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="min-h-screen bg-[#ECEEF2] overflow-x-hidden">
      {/* ════════ TOP BAR ════════ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          {/* Left — Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.svg" alt="Slate360" className="h-6 sm:h-7 w-auto" />
          </Link>

          {/* Center — Search (desktop only) */}
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

          {/* Right — Notifications + Customize + User (compact on mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((v) => !v)}
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <Bell size={18} />
                {unreadNotifications.length > 0 ? (
                  <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 rounded-full bg-[#FF4D00]" />
                ) : null}
              </button>
              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-bold text-gray-900">Notifications</p>
                    <button
                      onClick={() => void loadUnreadNotifications()}
                      className="text-xs font-semibold text-[#FF4D00] hover:opacity-80"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="px-4 py-6 text-sm text-gray-500">
                        <Loader2 size={14} className="mr-2 inline animate-spin" /> Loading…
                      </div>
                    ) : unreadNotifications.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-gray-500">No unread alerts.</div>
                    ) : (
                      unreadNotifications.map((notification) => (
                        <Link
                          key={notification.id}
                          href={notification.link_path || `/project-hub/${notification.project_id}`}
                          onClick={() => setNotificationsOpen(false)}
                          className="block border-b border-gray-50 px-4 py-3 hover:bg-gray-50"
                        >
                          <p className="text-sm font-semibold text-gray-800">{notification.title}</p>
                          <p className="mt-0.5 text-xs text-gray-600">{notification.message}</p>
                          <p className="mt-1 text-[11px] text-gray-400">{new Date(notification.created_at).toLocaleString()}</p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
            </div>

            {/* Customize */}
            <button
              onClick={() => setCustomizeOpen(true)}
              title="Customize dashboard"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[#FF4D00] transition-colors"
            >
              <SlidersHorizontal size={18} />
              {prefsDirty && <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 rounded-full bg-amber-400" />}
            </button>

            {/* User avatar / menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
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
                <ChevronDown size={14} className="hidden sm:block text-gray-400" />
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
                      <Link
                        href="/integrations"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Plug size={15} /> Integrations
                      </Link>
                      <button
                        onClick={handleOpenBillingPortal}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        {billingBusy === "portal" ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                        Billing & Payments
                      </button>
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
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
        {billingNotice && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${billingNotice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            {billingNotice.text}
          </div>
        )}

        {activeTab !== "overview" && (
          <div className="mb-6">
            <button
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        )}

        {/* ════════ OVERVIEW TAB CONTENT ════════ */}
        {activeTab === "overview" && (
        <>

        {/* ════════ WELCOME BANNER + WORKSPACE QUICK-ACCESS ════════ */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Welcome back, {user.name.split(" ")[0]} 👋</h2>
              <p className="text-sm text-gray-500 mt-1">Pick a module below or jump into a project to get started.</p>
            </div>
          </div>
          {prefShowDashboardTiles && (() => {
            // Include all visible tabs: modules + My Account + CEO-only tabs
            const allTiles = visibleTabs;
            const count = allTiles.length;
            // Tier-aware sizing: fewer modules → larger icons, more modules → compact
            const iconSize = count <= 4 ? 26 : count <= 6 ? 22 : count <= 10 ? 18 : 16;
            const iconBox = count <= 4 ? "w-14 h-14" : count <= 6 ? "w-12 h-12" : count <= 10 ? "w-10 h-10" : "w-9 h-9";
            const iconRadius = count <= 6 ? "rounded-2xl" : "rounded-xl";
            const labelSize = count <= 4 ? "text-sm" : count <= 6 ? "text-xs" : "text-[11px]";
            const pad = count <= 4 ? "p-5" : count <= 6 ? "p-4" : count <= 10 ? "p-3" : "p-2.5";
            return (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:flex gap-2 sm:gap-3 pb-1">
                {allTiles.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (tab.id === "slatedrop") { openSlateDrop(); return; }
                        if (tab.id === "project-hub") { router.push("/project-hub"); return; }
                        if (tab.id === "analytics") { router.push("/analytics"); return; }
                        if (tab.id === "ceo") { router.push("/ceo"); return; }
                        setActiveTab(tab.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`group md:flex-1 md:min-w-0 flex flex-col items-center gap-1.5 sm:gap-2 ${pad} rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-center`}
                    >
                      <div
                        className={`${iconBox} ${iconRadius} flex items-center justify-center transition-all group-hover:scale-110`}
                        style={{ backgroundColor: `${tab.color}15` }}
                      >
                        <TabIcon size={iconSize} style={{ color: tab.color }} />
                      </div>
                      <span className={`${labelSize} font-semibold text-gray-700 group-hover:text-gray-900 leading-tight truncate max-w-full`}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* ════════ MOBILE QUICK ACCESS — above Your Projects, mobile only ════════ */}
        <div className="block md:hidden mb-6">
          <div className="relative">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#1E3A8A] to-[#162D69] text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                  <LayoutDashboard size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black tracking-wide">Quick Access</p>
                  <p className="text-[11px] text-blue-200/80">Navigate modules &amp; tools</p>
                </div>
              </div>
              <ChevronDown size={16} className={`transition-transform duration-200 ${mobileNavOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileNavOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMobileNavOpen(false)} />
                <div className="relative z-40 mt-2 rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
                  {([
                    { label: "Dashboard",   icon: Home,        href: "/dashboard",    color: "#1E3A8A", desc: "Overview, widgets & projects" },
                    { label: "Project Hub", icon: FolderKanban, href: "/project-hub",  color: "#1E3A8A", desc: "RFIs, schedules & budgets" },
                    { label: "Analytics",   icon: BarChart3,   href: "/analytics",    color: "#1E3A8A", desc: "Reports & performance insights" },
                    { label: "SlateDrop",   icon: Layers,      href: "/slatedrop",    color: "#FF4D00", desc: "Files, folders & secure sharing" },
                  ]).map((item) => {
                    const NavIcon = item.icon as any;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${item.color}18` }}
                        >
                          <NavIcon size={16} style={{ color: item.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 leading-tight">{item.label}</p>
                          <p className="text-xs text-gray-500 leading-snug truncate">{item.desc}</p>
                        </div>
                      </Link>
                    );
                  })}
                  <div className="px-4 py-3 bg-gradient-to-r from-[#FF4D00]/5 to-[#1E3A8A]/5 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-center">Powered by Slate360</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ════════ PROJECT CAROUSEL ════════ */}
        <div className="relative mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Your Projects</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setProjectDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-gray-300 transition-colors"
                >
                  <FolderOpen size={13} className="text-gray-400" />
                  {selectedProject === "all" ? "All projects" : liveProjects.find((p) => p.id === selectedProject)?.name ?? "All projects"}
                  <ChevronDown size={12} className="text-gray-400" />
                </button>
                {projectDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setProjectDropdownOpen(false)} />
                    <div className="absolute right-0 top-10 w-56 bg-white rounded-xl border border-gray-100 shadow-xl z-40 overflow-hidden">
                      <button onClick={() => { setSelectedProject("all"); setProjectDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedProject === "all" ? "bg-[#FF4D00]/5 text-[#FF4D00] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>All projects</button>
                      {liveProjects.map((p) => (
                        <button key={p.id} onClick={() => { setSelectedProject(p.id); setProjectDropdownOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedProject === p.id ? "bg-[#FF4D00]/5 text-[#FF4D00] font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>{p.name}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Link href="/project-hub" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: "#FF4D00" }}>
                <Plus size={13} /> New Project
              </Link>
              <button onClick={() => scrollCarousel(-1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => scrollCarousel(1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {liveProjects.map((p) => (
              <Link
                key={p.id}
                href={`/project-hub/${p.id}`}
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

            {liveProjects.length === 0 && (
              <div className="snap-start shrink-0 w-full rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                No projects yet. Create a project in Project Hub to populate this dashboard.
              </div>
            )}

            {/* + New Project card */}
            <Link href="/project-hub" className="snap-start shrink-0 w-[300px] h-[200px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#FF4D00] flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-[#FF4D00] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white/50">
              <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-current flex items-center justify-center">
                <Plus size={24} />
              </div>
              <span className="text-sm font-semibold">New Project</span>
            </Link>
          </div>
        </div>

        {/* ════════ WIDGET GRID (data-driven, respects customization prefs) ════════ */}
        {(() => {
          // Compute which widgets are available for this tier
          const available = new Set<string>([
            ...(ent.canViewSlateDropWidget ? ["slatedrop"] : []),
            "location",
            "data-usage","processing","financial","calendar","weather","continue","contacts","suggest",
            ...(ent.canManageSeats ? ["seats"] : ["upgrade"]),
          ]);

          function renderWidget(id: string, widgetSize: WidgetSize, inPopout = false): React.ReactNode {
            const span = getWidgetSpan(id, widgetSize);
            const widgetColor = WIDGET_META.find((m) => m.id === id)?.color ?? "#FF4D00";
            const isExpanded = widgetSize !== "default";
            const handleSetSize = inPopout ? undefined : (s: WidgetSize) => {
              if (id === "slatedrop") {
                setSlateDropWidgetView("folders");
              }
              setWidgetPrefs((prev) => {
                const next = prev.map((p) => (p.id === id ? { ...p, size: s } : p));
                try { localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
                return next;
              });
              setPrefsDirty(true);
            };
            switch (id) {

              case "location": return (
          <WidgetCard key={id} icon={MapPin} title="Location" span={span} delay={0} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}>
            <div className={isExpanded ? "min-h-[400px]" : "min-h-[200px]"}>
              <LocationMap
                center={userCoords ?? undefined}
                locationLabel={liveWeather?.location}
                contactRecipients={liveSeatMembers.map((member) => ({ name: member.name, email: member.email }))}
                compact={!isExpanded}
                expanded={isExpanded}
              />
            </div>
          </WidgetCard>
              );
              case "slatedrop": return (
          <WidgetCard key={id} icon={FolderOpen} title="SlateDrop" span={span} delay={0} color={widgetColor} onSetSize={handleSetSize} size={widgetSize} action={
            <div className="inline-flex items-center rounded-lg border border-gray-200 p-0.5">
              <button
                onClick={() => setSlateDropWidgetView("recent")}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${slateDropWidgetView === "recent" ? "bg-[#FF4D00] text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Recent
              </button>
              <button
                onClick={() => setSlateDropWidgetView("folders")}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${slateDropWidgetView === "folders" ? "bg-[#1E3A8A] text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Folder View
              </button>
            </div>
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
              {slateDropWidgetView === "recent" ? (
                <div className="space-y-2">
                  {slateDropFiles && slateDropFiles.length > 0 ? (
                    slateDropFiles.slice(0, 3).map((file, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <FileText size={13} className="text-gray-400 shrink-0" />
                        <span className="text-[11px] text-gray-700 truncate flex-1">{file.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-gray-400">No recent files</div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {slateDropFolderQuickView.map((folder) => (
                    <div key={folder.name} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-gray-800 flex items-center gap-1.5">
                        <FolderOpen size={12} className="text-[#FF4D00]" /> {folder.name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">{folder.description}</p>
                    </div>
                  ))}
                  <p className="text-[10px] text-gray-400">Unlocked based on your {ent.label} plan.</p>
                </div>
              )}
              {isExpanded && (
                <div className="mt-2 text-xs text-gray-500">
                  <p className="text-[10px] text-gray-400">Pending uploads — </p>
                </div>
              )}
              <p className="text-[10px] text-gray-400">Open full SlateDrop from the main navigation.</p>
            </div>
          </WidgetCard>
          );

              case "data-usage": return (
          <WidgetCard key={id} icon={CreditCard} title="Data Usage & Credits" span={span} delay={0} color={widgetColor} onSetSize={handleSetSize} size={widgetSize} action={
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
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={handleBuyCredits}
                  disabled={billingBusy !== null}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  {billingBusy === "credits" ? (
                    <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</span>
                  ) : (
                    "Buy credits"
                  )}
                </button>
                <button
                  onClick={handleUpgradePlan}
                  disabled={billingBusy !== null}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  {billingBusy === "upgrade" ? (
                    <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</span>
                  ) : (
                    "Upgrade plan"
                  )}
                </button>
              </div>
              {billingError && <p className="text-[11px] text-red-500">{billingError}</p>}
            </div>
          </WidgetCard>
          );

              case "processing": return (
          <WidgetCard key={id} icon={Cpu} title="Processing Jobs" span={span} delay={50} color={widgetColor} onSetSize={handleSetSize} size={widgetSize} action={
            <span className="text-[11px] text-gray-400 font-medium">{liveJobs.filter((j) => j.status === "processing").length} active</span>
          }>
            <div className="space-y-3">
              {liveJobs.map((job) => (
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
              {liveJobs.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">No processing jobs right now</div>
              )}
            </div>
          </WidgetCard>
          );

              case "financial": return (
          <WidgetCard key={id} icon={TrendingUp} title="Financial Snapshot" span={span} delay={100} color={widgetColor} onSetSize={handleSetSize} size={widgetSize} action={
            <span className="text-[11px] text-gray-400 font-medium">Last 6 months</span>
          }>
            <div className="space-y-4">
              {/* Bar chart */}
              <div className="flex items-end gap-2 h-28">
                {liveFinancial.map((f, i) => (
                  <div key={f.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[9px] text-gray-400 font-medium">{f.credits > 0 ? `${(f.credits / 1000).toFixed(1)}k` : ""}</span>
                    <div className="w-full relative flex items-end justify-center" style={{ height: "80px" }}>
                      <div
                        className="w-full max-w-[32px] rounded-t-md transition-all duration-700 ease-out hover:opacity-80"
                        style={{
                          height: `${(f.credits / financialMax) * 100}%`,
                          backgroundColor: i === liveFinancial.length - 1 ? "#FF4D00" : "#1E3A8A",
                          opacity: i === liveFinancial.length - 1 ? 1 : 0.6,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{f.month}</span>
                  </div>
                ))}
                {liveFinancial.length === 0 && (
                  <div className="w-full text-center text-xs text-gray-400">No financial activity yet</div>
                )}
              </div>
              {/* Stats */}
              <div className="flex gap-4 pt-2 border-t border-gray-100">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">This month</p>
                  <p className="text-sm font-bold text-gray-900">{(liveFinancial[liveFinancial.length - 1]?.credits ?? 0).toLocaleString()} credits</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Avg / month</p>
                  <p className="text-sm font-bold text-gray-900">{Math.round(liveFinancial.reduce((sum, point) => sum + point.credits, 0) / Math.max(liveFinancial.length, 1)).toLocaleString()} credits</p>
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
            color={widgetColor}
            onSetSize={handleSetSize}
            size={widgetSize}
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
          <WidgetCard key={id} icon={Cloud} title="Weather" span={span} delay={200} color={widgetColor} onSetSize={handleSetSize} size={widgetSize} action={
            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1"><MapPin size={10} />{liveWeather?.location ?? "Location unavailable"}</span>
          }>
            <div className="space-y-4">
              {/* Current */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center mb-1">
                    {weatherIcon(liveWeather?.current.icon ?? "cloud-sun")}
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">{liveWeather?.current.temp ?? "--"}°<span className="text-base font-normal text-gray-400">F</span></p>
                  <p className="text-xs text-gray-500">{liveWeather?.current.condition ?? "Unavailable"}</p>
                </div>
                <div className="ml-auto text-right space-y-1">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end"><Droplets size={10} />{liveWeather?.current.humidity ?? "--"}%</p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end"><Wind size={10} />{liveWeather?.current.wind ?? "--"} mph</p>
                </div>
              </div>

              {/* 5-day forecast */}
              <div className="grid grid-cols-5 gap-1.5">
                {(liveWeather?.forecast ?? demoWeather.forecast).map((f) => (
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
                {(liveWeather?.constructionAlerts ?? demoWeather.constructionAlerts).map((a, i) => (
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
          <WidgetCard key={id} icon={Clock} title="Continue Working" span={span} delay={250} color={widgetColor} onSetSize={handleSetSize} size={widgetSize} action={
            <Link href="/dashboard" className="text-[11px] font-semibold text-[#FF4D00] hover:underline flex items-center gap-0.5">
              View all <ArrowRight size={11} />
            </Link>
          }>
            <div className="space-y-2">
              {liveContinueWorking.map((item, i) => {
                const Icon = item.kind === "design"
                  ? Palette
                  : item.kind === "tour"
                    ? Compass
                    : item.kind === "rfi"
                      ? MessageSquare
                      : item.kind === "report"
                        ? BarChart3
                        : FileText;
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
              {liveContinueWorking.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">No recent activity yet</div>
              )}
            </div>
          </WidgetCard>
          );

              case "contacts": return (
          <WidgetCard key={id} icon={Users} title="Contacts" span={span} delay={300} color={widgetColor} onSetSize={handleSetSize} size={widgetSize} action={
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
          <WidgetCard key={id} icon={Lightbulb} title="Suggest a Feature" span={span} delay={350} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}>
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
              color={widgetColor}
              onSetSize={handleSetSize}
              size={widgetSize}
              action={
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: "#FF4D00" }}>
                  <UserPlus size={13} /> Invite member
                </button>
              }
            >
              <div>
                <div className="flex items-center gap-6 mb-5">
                  <div>
                    <p className="text-2xl font-black text-gray-900">{liveSeatMembers.length}</p>
                    <p className="text-[10px] text-gray-400 font-medium">of {ent.maxSeats} seats used</p>
                  </div>
                  <div className="h-10 w-px bg-gray-100" />
                  <div>
                    <p className="text-2xl font-black text-emerald-600">{liveSeatMembers.filter((m) => m.active).length}</p>
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
                      {liveSeatMembers.map((m, i) => (
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
                      {liveSeatMembers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-xs text-gray-400">No seat members found for this organization</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </WidgetCard>
          );

              case "upgrade": return (
            <WidgetCard key={id} icon={Zap} title="Unlock more power" span={span} delay={400} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}>
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#FF4D001A" }}>
                  <Zap size={24} style={{ color: "#FF4D00" }} />
                </div>
                <p className="text-sm font-bold text-gray-900 mb-2">Upgrade to Business</p>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Get seat management, Project Hub, advanced analytics, and 30,000 credits per month.
                </p>
                <Link
                  href="/plans?plan=business&billing=monthly"
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

          const popoutMeta = widgetPopoutId ? WIDGET_META.find((item) => item.id === widgetPopoutId) : null;

          return (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orderedVisible.map((p, idx) => (
                  <div
                    key={p.id}
                    draggable={p.size === "default" && p.id !== "location"}
                    onDragStart={() => handleDashDragStart(idx)}
                    onDragOver={(e) => handleDashDragOver(e, idx)}
                    onDragEnd={handleDashDragEnd}
                    className={`${p.size !== "default" ? "" : "cursor-grab active:cursor-grabbing"} ${dashDragIdx === idx ? "opacity-50 scale-95" : ""} ${getWidgetSpan(p.id, p.size)} transition-all duration-200`}
                  >
                    {renderWidget(p.id, p.size)}
                  </div>
                ))}
              </div>

              {widgetPopoutId && available.has(widgetPopoutId) && (
                <div
                  className={`fixed z-[10000] flex flex-col overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.55)] ${wdIsMobile ? "rounded-none border-0" : "rounded-2xl border border-gray-700/70"}`}
                  style={{
                    left: wdIsMobile ? 0 : wdPos.x,
                    top: wdIsMobile ? 0 : wdPos.y,
                    width: wdIsMobile ? "100vw" : wdSize.w,
                    height: wdMinimized ? "auto" : (wdIsMobile ? "100dvh" : wdSize.h),
                  }}
                >
                  <div
                    className={`flex items-center gap-3 px-4 h-11 bg-gray-900 select-none shrink-0 ${wdIsMobile ? "" : "cursor-grab active:cursor-grabbing"}`}
                    onPointerDown={wdIsMobile ? undefined : onWdTitleDown}
                    onPointerMove={wdIsMobile ? undefined : onWdPointerMove}
                    onPointerUp={wdIsMobile ? undefined : onWdPointerUp}
                  >
                    <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setWidgetPopoutId(null)}
                        className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center group transition-colors"
                        title="Close"
                      >
                        <X size={7} className="text-red-900 opacity-0 group-hover:opacity-100" />
                      </button>
                      <button
                        onClick={() => setWdMinimized((value) => !value)}
                        className="w-3.5 h-3.5 rounded-full bg-yellow-400 hover:bg-yellow-300 transition-colors"
                        title={wdMinimized ? "Restore" : "Minimise"}
                      />
                      {!wdIsMobile && (
                        <button
                          onClick={() => {
                            setWdSize({ w: window.innerWidth - 32, h: window.innerHeight - 32 });
                            setWdPos({ x: 16, y: 16 });
                            setWdMinimized(false);
                          }}
                          className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
                          title="Maximise"
                        />
                      )}
                    </div>
                    <LayoutDashboard size={14} className="text-[#FF4D00] ml-1 shrink-0" />
                    <span className="text-[13px] font-semibold text-white/90 flex-1 text-center -ml-8 pointer-events-none">
                      {popoutMeta?.label ?? "Widget"}
                    </span>
                  </div>

                  {!wdMinimized && (
                    <div className="flex-1 overflow-auto bg-[#ECEEF2] p-4">
                      {renderWidget(widgetPopoutId, "lg", true)}
                    </div>
                  )}

                  {!wdMinimized && !wdIsMobile && (
                    <div
                      className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
                      style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.18) 50%)" }}
                      onPointerDown={onWdResizeDown}
                      onPointerMove={onWdPointerMove}
                      onPointerUp={onWdPointerUp}
                    />
                  )}
                </div>
              )}
            </>
          );
        })()}

        </>
        )}

        {/* ════════ SPECIFIC TAB WIREFRAME ════════ */}
        {activeTab === "market" && (
          <MarketClient />
        )}
        {activeTab === "my-account" && (
          <div className="space-y-6">
            {(() => {
              const usagePct = accountOverview
                ? accountOverview.usage.storageUsedGb / Math.max(accountOverview.usage.storageLimitGb, 1)
                : storageUsed / Math.max(ent.maxStorageGB, 1);
              const usageHealth = usagePct < 0.7 ? "Healthy" : usagePct < 0.9 ? "Watch" : "Critical";
              const usageHealthClass = usagePct < 0.7 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : usagePct < 0.9 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200";
              const isAdmin = accountOverview?.isAdmin ?? false;
              const completionChecks = [
                Boolean(accountOverview?.profile.name),
                Boolean(accountOverview?.profile.email),
                Boolean(accountOverview?.profile.orgName),
                Boolean(accountOverview?.profile.role),
                Boolean(prefTheme),
                Boolean(prefStartTab),
                Boolean(prefNotification),
              ];
              const profileCompletion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);
              return (
                <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
              <div>
                <h2 className="text-2xl font-black text-gray-900">My Account</h2>
                <p className="text-sm text-gray-500 mt-1">Profile, billing, and account controls.</p>
              </div>
              <button
                onClick={() => void loadAccountOverview()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {accountLoading ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />} Refresh
              </button>
            </div>

            {accountError && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {accountError}
              </div>
            )}

            {apiKeyError && (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {apiKeyError}
              </div>
            )}

            <div className="text-[11px] text-gray-500 px-1">
              {isAdmin ? "Owner/Admin view: full account controls enabled." : "Member view: personal settings and read-only plan summary."}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <WidgetCard icon={User} title="Account At A Glance" span="xl:col-span-2" action={
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${usageHealthClass}`}>
                  {usageHealth}
                </span>
              }>
                {accountLoading && !accountOverview ? (
                  <div className="py-6 flex items-center justify-center text-sm text-gray-400">
                    <Loader2 size={16} className="animate-spin mr-2" /> Loading account details…
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Name</p>
                        <p className="text-sm font-semibold text-gray-900">{accountOverview?.profile.name ?? user.name}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Email</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{accountOverview?.profile.email ?? user.email}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Organization</p>
                        <p className="text-sm font-semibold text-gray-900">{accountOverview?.profile.orgName ?? "Slate360 Organization"}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Role</p>
                        <p className="text-sm font-semibold text-gray-900 capitalize">{accountOverview?.profile.role ?? "member"}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Storage Health</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {(accountOverview?.usage.storageUsedGb ?? storageUsed).toFixed(1)} / {(accountOverview?.usage.storageLimitGb ?? ent.maxStorageGB).toFixed(0)} GB
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${usageHealthClass}`}>{usageHealth}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button onClick={() => void applyLayoutPreset("simple")} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Simple View</button>
                      <button onClick={() => void applyLayoutPreset("creator")} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Creator View</button>
                      <button onClick={() => void applyLayoutPreset("project")} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Project View</button>
                    </div>
                  </div>
                )}
              </WidgetCard>

              <WidgetCard icon={CreditCard} title={isAdmin ? "Subscription & Billing" : "Plan & Usage Summary"} action={
                <button
                  onClick={handleOpenBillingPortal}
                  className="text-[11px] font-semibold text-[#FF4D00] hover:underline"
                >
                  {isAdmin ? "Manage Billing" : "View Billing"}
                </button>
              }>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Current Plan</p>
                    <p className="text-sm font-semibold text-gray-900">{accountOverview?.billing.plan ?? ent.label}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Status</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{accountOverview?.billing.status ?? "active"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Renewal</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {accountOverview?.billing.renewsOn ? new Date(accountOverview.billing.renewsOn).toLocaleDateString() : "Not available"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Seats</p>
                    <p className="text-sm font-semibold text-gray-900">{isAdmin ? "4 used / 10 included" : "Managed by your organization"}</p>
                  </div>
                  {isAdmin && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Plan Preview</p>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center justify-between"><span>Starter</span><span className="font-semibold text-gray-700">Basic access</span></div>
                        <div className="flex items-center justify-between"><span>Pro</span><span className="font-semibold text-gray-700">Advanced tools</span></div>
                        <div className="flex items-center justify-between"><span>Enterprise</span><span className="font-semibold text-gray-700">Full suite</span></div>
                      </div>
                    </div>
                  )}
                  {isAdmin ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={handleBuyCredits}
                        className="text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Buy Credits
                      </button>
                      <button
                        onClick={handleUpgradePlan}
                        className="text-xs font-semibold py-2 rounded-lg text-white hover:opacity-90 transition-all"
                        style={{ backgroundColor: "#FF4D00" }}
                      >
                        Upgrade
                      </button>
                      <button
                        onClick={() => setActiveTab("overview")}
                        className="text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Manage Seats
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500">Read-only plan details. Billing controls are available for owner/admin roles.</p>
                  )}
                </div>
              </WidgetCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <WidgetCard icon={Bell} title="Profile & Preferences">
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Theme</p>
                    <select value={prefTheme} onChange={(e) => setPrefTheme(e.target.value as "light" | "dark" | "system")} className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white">
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Default Start Tab</p>
                    <select value={prefStartTab} onChange={(e) => setPrefStartTab(e.target.value)} className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white">
                      <option value="overview">Dashboard</option>
                      <option value="project-hub">Project Hub</option>
                      <option value="tours">360 Tours</option>
                      <option value="content-studio">Content Studio</option>
                    </select>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Notification Frequency</p>
                    <select value={prefNotification} onChange={(e) => setPrefNotification(e.target.value as "off" | "daily" | "weekly")} className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white">
                      <option value="off">Off</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <label className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-700">Important Alerts</span>
                    <input type="checkbox" checked={prefImportantAlerts} onChange={(e) => setPrefImportantAlerts(e.target.checked)} className="h-4 w-4 accent-[#FF4D00]" />
                  </label>
                  <label className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-700">Show Dashboard Tiles</span>
                    <input type="checkbox" checked={prefShowDashboardTiles} onChange={(e) => setPrefShowDashboardTiles(e.target.checked)} className="h-4 w-4 accent-[#FF4D00]" />
                  </label>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-700">Profile Completeness</span>
                      <span className="text-xs font-bold text-gray-900">{profileCompletion}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-[#1E3A8A]" style={{ width: `${profileCompletion}%` }} />
                    </div>
                  </div>
                  <button onClick={() => void saveAccountPreferences()} className="w-full text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Save Preferences</button>
                </div>
              </WidgetCard>

              <WidgetCard icon={Shield} title="Security & Access">
                <div className="space-y-2">
                  <Link href="/forgot-password" className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                    <span className="text-xs font-semibold text-gray-700">Reset password</span>
                    <ArrowRight size={12} className="text-gray-400" />
                  </Link>
                  <button className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors text-left">
                    <span className="text-xs font-semibold text-gray-700">2FA status</span>
                    <span className="text-[11px] font-semibold text-gray-500">Coming soon</span>
                  </button>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">Recent sessions</span>
                      <span className="text-[11px] font-semibold text-gray-500">Last 3</span>
                    </div>
                    <div className="space-y-1.5">
                      {(accountOverview?.sessions ?? []).slice(0, 3).map((session) => (
                        <div key={session.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-gray-700 truncate">{session.device}</p>
                            <p className="text-[10px] text-gray-400">{session.ip}</p>
                          </div>
                          <p className="text-[10px] text-gray-400 shrink-0">{new Date(session.lastActive).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </WidgetCard>

              {isAdmin && (
              <WidgetCard icon={Activity} title="Data & Storage">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">Storage used</span>
                      <span className="text-xs font-bold text-gray-900">
                        {(accountOverview?.usage.storageUsedGb ?? storageUsed).toFixed(1)} GB / {(accountOverview?.usage.storageLimitGb ?? ent.maxStorageGB).toLocaleString()} GB
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1E3A8A]"
                        style={{ width: `${Math.min(((accountOverview?.usage.storageUsedGb ?? storageUsed) / (accountOverview?.usage.storageLimitGb ?? ent.maxStorageGB)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Projects</p>
                      <p className="text-sm font-semibold text-gray-900">{(accountOverview?.usage.projectsCount ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Models</p>
                      <p className="text-sm font-semibold text-gray-900">{(accountOverview?.usage.modelsCount ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tours</p>
                      <p className="text-sm font-semibold text-gray-900">{(accountOverview?.usage.toursCount ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Documents</p>
                      <p className="text-sm font-semibold text-gray-900">{(accountOverview?.usage.docsCount ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Purchased Credits</p>
                    <p className="text-sm font-semibold text-gray-900">{(accountOverview?.billing.purchasedCredits ?? 0).toLocaleString()}</p>
                  </div>
                  <button onClick={() => setBillingNotice({ ok: true, text: "Data export request submitted." })} className="w-full text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Download my data</button>
                  <button onClick={() => setBillingNotice({ ok: false, text: "Deletion request started. Support will follow up." })} className="w-full text-xs font-semibold py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Request deletion</button>
                </div>
              </WidgetCard>
              )}

              {isAdmin && (
                <WidgetCard icon={FileText} title="API & Integrations" span="md:col-span-2 xl:col-span-2">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={apiKeyLabel}
                        onChange={(e) => setApiKeyLabel(e.target.value)}
                        placeholder="Key label (e.g. CI Runner)"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                      />
                      <button
                        onClick={() => void handleGenerateApiKey()}
                        disabled={apiKeyBusy === "create"}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60"
                        style={{ backgroundColor: "#FF4D00" }}
                      >
                        {apiKeyBusy === "create" ? "Generating…" : "Generate Key"}
                      </button>
                    </div>
                    {generatedApiKey && (
                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 mb-1">Copy now — shown once</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono text-amber-800 truncate flex-1">{generatedApiKey}</p>
                          <button onClick={() => void copyText(generatedApiKey, "API key")} className="text-[11px] font-semibold text-amber-700 hover:underline">Copy</button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {(accountOverview?.apiKeys ?? []).length === 0 ? (
                        <p className="text-xs text-gray-400">No active API keys yet.</p>
                      ) : (
                        (accountOverview?.apiKeys ?? []).map((key) => (
                          <div key={key.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">{key.label}</p>
                              <p className="text-[10px] text-gray-400">••••{key.lastFour} · {new Date(key.createdAt).toLocaleDateString()}</p>
                            </div>
                            <button
                              onClick={() => void copyText(`••••${key.lastFour}`, "Key reference")}
                              className="text-[11px] font-semibold text-gray-500 hover:text-gray-700"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => void handleRevokeApiKey(key.id)}
                              disabled={apiKeyBusy === key.id}
                              className="text-[11px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-60"
                            >
                              {apiKeyBusy === key.id ? "Revoking…" : "Revoke"}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </WidgetCard>
              )}

              {isAdmin && (
                <WidgetCard icon={Shield} title="Audit Log">
                  <div className="space-y-2">
                    {(accountOverview?.auditLog ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400">No recent sensitive actions.</p>
                    ) : (
                      (accountOverview?.auditLog ?? []).slice(0, 5).map((event) => (
                        <div key={event.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-800">{event.action}</p>
                          <p className="text-[10px] text-gray-400">{event.actor} · {new Date(event.createdAt).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </WidgetCard>
              )}
            </div>
                </>
              );
            })()}
          </div>
        )}
        {activeTab === "project-hub" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Open Project Hub</h3>
            <p className="mt-1 text-sm text-gray-500">Project Hub now runs in its dedicated workspace route.</p>
            <Link
              href="/project-hub"
              className="mt-4 inline-flex items-center rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E64500]"
            >
              Go to Project Hub
            </Link>
          </div>
        )}
        {activeTab === "integrations" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Open Integrations</h3>
            <p className="mt-1 text-sm text-gray-500">Integrations now runs in its dedicated workspace route.</p>
            <Link
              href="/integrations"
              className="mt-4 inline-flex items-center rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#162D69]"
            >
              Go to Integrations
            </Link>
          </div>
        )}
        {activeTab === "analytics" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Open Analytics &amp; Reports</h3>
            <p className="mt-1 text-sm text-gray-500">Analytics &amp; Reports now runs in its dedicated workspace route.</p>
            <Link
              href="/analytics"
              className="mt-4 inline-flex items-center rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#162D69]"
            >
              Go to Analytics
            </Link>
          </div>
        )}
        {activeTab === "ceo" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Open CEO Command Center</h3>
            <p className="mt-1 text-sm text-gray-500">The CEO Command Center now runs in its dedicated workspace route.</p>
            <Link
              href="/ceo"
              className="mt-4 inline-flex items-center rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E64500]"
            >
              Go to CEO Command Center
            </Link>
          </div>
        )}
        {activeTab !== "overview" && activeTab !== "market" && activeTab !== "my-account" && activeTab !== "project-hub" && activeTab !== "integrations" && activeTab !== "analytics" && activeTab !== "ceo" && (() => {
          const tab = visibleTabs.find((t) => t.id === activeTab);
          if (!tab) return null;
          return <TabWireframe tab={tab} onBack={() => setActiveTab("overview")} onOpenSlateDrop={openSlateDrop} />;
        })()}
      </main>

      {/* ════════ CUSTOMIZE PANEL (shared drawer) ════════ */}
      <WidgetCustomizeDrawer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize Dashboard"
        subtitle="Reorder, show or hide, and resize widgets"
        widgetPrefs={widgetPrefs}
        widgetMeta={drawerMeta}
        onToggleVisible={toggleVisible}
        onSetSize={setWidgetSize}
        onMoveOrder={moveWidget}
        onReset={resetPrefs}
        onSave={async () => { await savePrefs(); setCustomizeOpen(false); }}
        saving={prefsSaving}
        dirty={prefsDirty}
      />

      {/* ════════ SLATEDROP FLOATING WINDOW ════════ */}
      {slateDropOpen && (
        <div
          className={`fixed z-[9999] flex flex-col overflow-hidden shadow-[0_32px_80px_-12px_rgba(0,0,0,0.55)] ${sdIsMobile ? "rounded-none border-0" : "rounded-2xl border border-gray-700/70"}`}
          style={{
            left: sdIsMobile ? 0 : sdPos.x,
            top: sdIsMobile ? 0 : sdPos.y,
            width: sdIsMobile ? "100vw" : sdSize.w,
            height: sdMinimized ? "auto" : (sdIsMobile ? "100dvh" : sdSize.h),
          }}
        >
          {/* ── Title bar / drag handle ── */}
          <div
            className={`flex items-center gap-3 px-4 h-11 bg-gray-900 select-none shrink-0 ${sdIsMobile ? "" : "cursor-grab active:cursor-grabbing"}`}
            onPointerDown={sdIsMobile ? undefined : onSdTitleDown}
            onPointerMove={sdIsMobile ? undefined : onSdPointerMove}
            onPointerUp={sdIsMobile ? undefined : onSdPointerUp}
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
              {!sdIsMobile && <button
                onClick={() => { setSdSize({ w: window.innerWidth - 32, h: window.innerHeight - 32 }); setSdPos({ x: 16, y: 16 }); setSdMinimized(false); }}
                className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
                title="Maximise"
              />}
            </div>
            <FolderOpen size={14} className="text-[#FF4D00] ml-1 shrink-0" />
            <span className="text-[13px] font-semibold text-white/90 flex-1 text-center -ml-8 pointer-events-none">SlateDrop</span>
          </div>

          {/* ── Embedded SlateDropClient ── */}
          {!sdMinimized && (
            <div className="flex-1 overflow-hidden">
              <SlateDropClient user={user} tier={tier} />
            </div>
          )}

          {/* ── Resize handle (bottom-right corner) ── */}
          {!sdMinimized && !sdIsMobile && (
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
