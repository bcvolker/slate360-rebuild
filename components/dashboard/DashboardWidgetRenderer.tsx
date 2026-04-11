"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  CreditCard,
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  FileText,
  FolderOpen,
  Lightbulb,
  Loader2,
  MapPin,
  MessageSquare,
  Palette,
  Send,
  Snowflake,
  Sun,
  TrendingUp,
  Users,
  UserPlus,
  Wind,
  XCircle,
  Zap,
  AlertTriangle,
} from "lucide-react";
import LocationMap from "./LocationMap";
import WidgetCard from "@/components/widgets/WidgetCard";
import SlateDropWidgetBody from "@/components/widgets/SlateDropWidgetBody";
import CalendarWidget from "@/components/calendar/CalendarWidget";
import ContactsWidget from "@/components/contacts/ContactsWidget";
import { listSlateDropRootFolders } from "@/lib/slatedrop/folderTree";
import {
  WIDGET_META,
  type WidgetSize,
  type WidgetPref,
  getWidgetSpan,
  DASHBOARD_STORAGE_KEY,
} from "@/lib/widgets/widget-meta";
import type { Tier } from "@/lib/entitlements";
import type {
  DashboardProject as Project,
  DashboardJob as Job,
  DashboardContact as Contact,
  LiveWeatherState,
} from "@/lib/types/dashboard";
import { DEMO_WEATHER } from "@/lib/dashboard/demo-data";

/* ── SlateDrop Compact Grid (shown at default/sm widget size) ── */

function SlateDropCompactGrid({ tier }: { tier: Tier }) {
  const folders = listSlateDropRootFolders(tier);
  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 flex-1 content-start">
        {folders.map((f) => (
          <Link
            key={f.id}
            href="/slatedrop"
            className="group flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-zinc-800/60 transition-colors"
          >
            <span className="text-2xl">{f.icon ?? "📁"}</span>
            <span className="text-[10px] font-medium text-zinc-400 group-hover:text-white text-center leading-tight line-clamp-2">
              {f.name}
            </span>
          </Link>
        ))}
      </div>
      <div className="pt-2 border-t border-zinc-800 mt-auto">
        <p className="text-[10px] text-zinc-500 text-center">
          Expand widget or click &ldquo;Open Full View&rdquo; for file management
        </p>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

const weatherIcon = (icon: string) => {
  switch (icon) {
    case "sun": return <Sun size={18} className="text-amber-400" />;
    case "cloud-sun": return <CloudSun size={18} className="text-zinc-400" />;
    case "cloud": return <Cloud size={18} className="text-zinc-400" />;
    case "rain": return <CloudRain size={18} className="text-blue-400" />;
    case "snow": return <Snowflake size={18} className="text-sky-300" />;
    default: return <Sun size={18} className="text-amber-400" />;
  }
};

const statusColor = (s: Job["status"]) => {
  switch (s) {
    case "completed": return "text-emerald-400 bg-emerald-950/40";
    case "processing": return "text-amber-400 bg-amber-950/40";
    case "queued": return "text-zinc-400 bg-zinc-800";
    case "failed": return "text-red-400 bg-red-950/40";
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

/* ── Types ───────────────────────────────────────────────────── */

interface ContinueItem {
  kind: "design" | "tour" | "rfi" | "report" | string;
  title: string;
  subtitle: string;
  href: string;
  time: string;
}

interface SeatMember {
  name: string;
  email: string;
  role: string;
  active: boolean;
}

interface FinancialPoint {
  month: string;
  credits: number;
}

export interface WidgetRendererContext {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  entitlements: { maxCredits: number; maxStorageGB: number; maxSeats: number; label: string; canViewSlateDropWidget: boolean; canManageSeats: boolean };
  userCoords: { lat: number; lng: number } | null;
  liveWeather: LiveWeatherState | null;
  liveSeatMembers: SeatMember[];
  liveContacts: Contact[];
  liveProjects: Project[];
  liveJobs: Job[];
  liveFinancial: FinancialPoint[];
  liveContinueWorking: ContinueItem[];
  creditsUsed: number;
  storageUsed: number;
  financialMax: number;
  billingBusy: string | null;
  billingError: string | null;
  handleBuyCredits: () => void;
  handleUpgradePlan: () => void;
  suggestTitle: string;
  suggestDesc: string;
  suggestPriority: "low" | "medium" | "high";
  suggestLoading: boolean;
  suggestDone: boolean;
  setSuggestTitle: (v: string) => void;
  setSuggestDesc: (v: string) => void;
  setSuggestPriority: (v: "low" | "medium" | "high") => void;
  handleSuggestFeature: () => void;
  weatherLogged: boolean;
  setWeatherLogged: (v: boolean) => void;
  setWidgetPrefs: React.Dispatch<React.SetStateAction<WidgetPref[]>>;
  setPrefsDirty: (v: boolean) => void;
}

/* ── Component ───────────────────────────────────────────────── */

export default function DashboardWidgetRenderer({
  id,
  widgetSize,
  inPopout = false,
  ctx,
}: {
  id: string;
  widgetSize: WidgetSize;
  inPopout?: boolean;
  ctx: WidgetRendererContext;
}): ReactNode {
  const span = getWidgetSpan(id, widgetSize);
  const widgetColor = WIDGET_META.find((m) => m.id === id)?.color ?? "#D4AF37";
  const isExpanded = widgetSize !== "default" && widgetSize !== "sm";
  const handleSetSize = inPopout
    ? undefined
    : (s: WidgetSize) => {
        ctx.setWidgetPrefs((prev) => {
          const next = prev.map((p) => (p.id === id ? { ...p, size: s } : p));
          try { localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
        ctx.setPrefsDirty(true);
      };

  switch (id) {
    case "location":
      return (
        <WidgetCard key={id} icon={MapPin} title="Location" span={span} delay={0} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}>
          <div className={isExpanded ? "min-h-[400px]" : "min-h-[200px]"}>
            <LocationMap
              center={ctx.userCoords ?? undefined}
              locationLabel={ctx.liveWeather?.location}
              contactRecipients={[
                ...ctx.liveSeatMembers.map((m) => ({ name: m.name, email: m.email })),
                ...ctx.liveContacts
                  .filter((c) => c.email && !ctx.liveSeatMembers.some((m) => m.email === c.email))
                  .map((c) => ({ name: c.name, email: c.email! })),
              ]}
              compact={!isExpanded}
              expanded={isExpanded}
            />
          </div>
        </WidgetCard>
      );

    case "slatedrop":
      return (
        <WidgetCard key={id} icon={FolderOpen} title="SlateDrop" span={span} delay={0} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}
          action={<Link href="/slatedrop" className="text-[11px] font-bold text-[#D4AF37] hover:underline">Open Full View →</Link>}
        >
          {isExpanded ? (
            <SlateDropWidgetBody user={ctx.user} tier={ctx.tier} />
          ) : (
            <SlateDropCompactGrid tier={ctx.tier} />
          )}
        </WidgetCard>
      );

    case "data-usage":
      return (
        <WidgetCard key={id} icon={CreditCard} title="Data Usage & Credits" span={span} delay={0} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}
          action={
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ backgroundColor: "#D4AF371A", color: "#D4AF37" }}>
              {ctx.entitlements.label}
            </span>
          }
        >
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">Credits used</span>
                <span className="text-xs font-bold text-white">{ctx.creditsUsed.toLocaleString()} / {ctx.entitlements.maxCredits.toLocaleString()}</span>
              </div>
              <div className="h-2.5 rounded-full bg-zinc-700 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min((ctx.creditsUsed / ctx.entitlements.maxCredits) * 100, 100)}%`, backgroundColor: "#D4AF37" }} />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">{(ctx.entitlements.maxCredits - ctx.creditsUsed).toLocaleString()} credits remaining this period</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400 font-medium">Storage</span>
                <span className="text-xs font-bold text-white">{ctx.storageUsed} GB / {ctx.entitlements.maxStorageGB} GB</span>
              </div>
              <div className="h-2.5 rounded-full bg-zinc-700 overflow-hidden">
                <div className="h-full rounded-full bg-[#D4AF37] transition-all duration-1000 ease-out" style={{ width: `${Math.min((ctx.storageUsed / ctx.entitlements.maxStorageGB) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button onClick={ctx.handleBuyCredits} disabled={ctx.billingBusy !== null} className="flex-1 text-xs font-semibold py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-60">
                {ctx.billingBusy === "credits" ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</span> : "Buy credits"}
              </button>
              <button onClick={ctx.handleUpgradePlan} disabled={ctx.billingBusy !== null} className="flex-1 text-xs font-semibold py-2 rounded-lg text-white transition-all hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: "#D4AF37" }}>
                {ctx.billingBusy === "upgrade" ? <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</span> : "Upgrade plan"}
              </button>
            </div>
            {ctx.billingError && <p className="text-[11px] text-red-500">{ctx.billingError}</p>}
          </div>
        </WidgetCard>
      );

    case "processing":
      return (
        <WidgetCard key={id} icon={Cpu} title="Processing Jobs" span={span} delay={50} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}
          action={<span className="text-[11px] text-zinc-500 font-medium">{ctx.liveJobs.filter((j) => j.status === "processing").length} active</span>}
        >
          <div className="space-y-3">
            {ctx.liveJobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors group">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${statusColor(job.status)}`}>{statusIcon(job.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{job.name}</p>
                  <p className="text-[10px] text-zinc-500">{job.type}</p>
                </div>
                {job.status === "processing" && (
                  <div className="w-16">
                    <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${job.progress}%`, backgroundColor: "#D4AF37" }} />
                    </div>
                    <p className="text-[9px] text-zinc-500 text-right mt-0.5">{job.progress}%</p>
                  </div>
                )}
                {job.status === "completed" && <span className="text-[10px] text-emerald-600 font-medium">Done</span>}
                {job.status === "queued" && <span className="text-[10px] text-zinc-500 font-medium">Queued</span>}
              </div>
            ))}
            {ctx.liveJobs.length === 0 && <div className="text-center py-4 text-xs text-zinc-500">No processing jobs right now</div>}
          </div>
        </WidgetCard>
      );

    case "financial":
      return (
        <WidgetCard key={id} icon={TrendingUp} title="Financial Snapshot" span={span} delay={100} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}
          action={<span className="text-[11px] text-zinc-500 font-medium">Last 6 months</span>}
        >
          <div className="space-y-4">
            <div className="flex items-end gap-2 h-28">
              {ctx.liveFinancial.map((f, i) => (
                <div key={f.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] text-zinc-500 font-medium">{f.credits > 0 ? `${(f.credits / 1000).toFixed(1)}k` : ""}</span>
                  <div className="w-full relative flex items-end justify-center" style={{ height: "80px" }}>
                    <div className="w-full max-w-[32px] rounded-t-md transition-all duration-700 ease-out hover:opacity-80"
                      style={{ height: `${(f.credits / ctx.financialMax) * 100}%`, backgroundColor: i === ctx.liveFinancial.length - 1 ? "#D4AF37" : "#6366F1", opacity: i === ctx.liveFinancial.length - 1 ? 1 : 0.6 }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500">{f.month}</span>
                </div>
              ))}
              {ctx.liveFinancial.length === 0 && <div className="w-full text-center text-xs text-zinc-500">No financial activity yet</div>}
            </div>
            <div className="flex gap-4 pt-2 border-t border-zinc-800">
              <div>
                <p className="text-[10px] text-zinc-500 font-medium">This month</p>
                <p className="text-sm font-bold text-white">{(ctx.liveFinancial[ctx.liveFinancial.length - 1]?.credits ?? 0).toLocaleString()} credits</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-medium">Avg / month</p>
                <p className="text-sm font-bold text-white">{Math.round(ctx.liveFinancial.reduce((sum, p) => sum + p.credits, 0) / Math.max(ctx.liveFinancial.length, 1)).toLocaleString()} credits</p>
              </div>
            </div>
          </div>
        </WidgetCard>
      );

    case "calendar":
      return (
        <CalendarWidget
          key={id}
          span={span}
          widgetSize={widgetSize}
          widgetColor={widgetColor}
          onSetSize={handleSetSize}
          projects={ctx.liveProjects.map((p) => ({ id: p.id, name: p.name }))}
        />
      );

    case "weather":
      return (
        <WidgetCard key={id} icon={Cloud} title="Weather" span={span} delay={200} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}
          action={<span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1"><MapPin size={10} />{ctx.liveWeather?.location ?? "Location unavailable"}</span>}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center mb-1">
                  {weatherIcon(ctx.liveWeather?.current.icon ?? "cloud-sun")}
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-white">{ctx.liveWeather?.current.temp ?? "--"}°<span className="text-base font-normal text-zinc-500">F</span></p>
                <p className="text-xs text-zinc-400">{ctx.liveWeather?.current.condition ?? "Unavailable"}</p>
              </div>
              <div className="ml-auto text-right space-y-1">
                <p className="text-[10px] text-zinc-500 flex items-center gap-1 justify-end"><Droplets size={10} />{ctx.liveWeather?.current.humidity ?? "--"}%</p>
                <p className="text-[10px] text-zinc-500 flex items-center gap-1 justify-end"><Wind size={10} />{ctx.liveWeather?.current.wind ?? "--"} mph</p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(ctx.liveWeather?.forecast ?? DEMO_WEATHER.forecast).map((f) => (
                <div key={f.day} className="text-center p-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                  <p className="text-[10px] text-zinc-500 font-semibold mb-1">{f.day}</p>
                  {weatherIcon(f.icon)}
                  <p className="text-[10px] font-bold text-white mt-1">{f.hi}°</p>
                  <p className="text-[9px] text-zinc-500">{f.lo}°</p>
                  {f.precip >= 40 && <p className="text-[9px] text-blue-500 font-medium mt-0.5">{f.precip}%</p>}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {(ctx.liveWeather?.constructionAlerts ?? DEMO_WEATHER.constructionAlerts).map((a, i) => (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${a.severity === "warning" ? "bg-amber-50 text-amber-700" : a.severity === "caution" ? "bg-amber-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /><span className="leading-relaxed">{a.message}</span>
                </div>
              ))}
            </div>
            <button onClick={() => ctx.setWeatherLogged(true)} disabled={ctx.weatherLogged} className="w-full text-xs font-semibold py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {ctx.weatherLogged ? <><CheckCircle2 size={13} className="text-emerald-500" /> Logged to daily report</> : <><Send size={12} /> Log to Daily Report</>}
            </button>
          </div>
        </WidgetCard>
      );

    case "continue":
      return (
        <WidgetCard key={id} icon={Clock} title="Continue Working" span={span} delay={250} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}
          action={<Link href="/dashboard" className="text-[11px] font-semibold text-[#D4AF37] hover:underline flex items-center gap-0.5">View all <ArrowRight size={11} /></Link>}
        >
          <div className="space-y-2">
            {ctx.liveContinueWorking.map((item, i) => {
              const Icon = item.kind === "design" ? Palette : item.kind === "tour" ? Compass : item.kind === "rfi" ? MessageSquare : item.kind === "report" ? BarChart3 : FileText;
              return (
                <Link key={i} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-[#D4AF37] transition-colors"><Icon size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-[#D4AF37] transition-colors">{item.title}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0">{item.time}</span>
                </Link>
              );
            })}
            {ctx.liveContinueWorking.length === 0 && <div className="text-center py-4 text-xs text-zinc-500">No recent activity yet</div>}
          </div>
        </WidgetCard>
      );

    case "contacts":
      return (
        <ContactsWidget
          key={id}
          span={span}
          widgetSize={widgetSize}
          widgetColor={widgetColor}
          onSetSize={handleSetSize}
          memberContacts={ctx.liveContacts.map((c) => ({
            id: c.email ?? c.name,
            name: c.name,
            email: c.email,
            initials: c.initials,
            color: c.color,
            title: c.role,
            is_archived: false,
            contact_projects: [],
            contact_files: [],
          }))}
          projects={ctx.liveProjects.map((p) => ({ id: p.id, name: p.name }))}
        />
      );

    case "suggest":
      return (
        <WidgetCard key={id} icon={Lightbulb} title="Suggest a Feature" span={span} delay={350} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}>
          {ctx.suggestDone ? (
            <div className="text-center py-6">
              <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
              <p className="text-sm font-semibold text-white mb-1">Thank you!</p>
              <p className="text-xs text-zinc-500">Your suggestion has been sent to our team.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Title</label>
                <input type="text" placeholder="What feature would you like?" value={ctx.suggestTitle} onChange={(e) => ctx.setSuggestTitle(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Description</label>
                <textarea placeholder="Tell us more about what you need…" value={ctx.suggestDesc} onChange={(e) => ctx.setSuggestDesc(e.target.value)} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Priority</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((p) => (
                    <button key={p} onClick={() => ctx.setSuggestPriority(p)} className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-all capitalize ${ctx.suggestPriority === p ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <button onClick={ctx.handleSuggestFeature} disabled={ctx.suggestLoading || !ctx.suggestTitle.trim() || !ctx.suggestDesc.trim()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: "#D4AF37" }}>
                {ctx.suggestLoading ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Submit suggestion</>}
              </button>
            </div>
          )}
        </WidgetCard>
      );

    case "seats":
      return (
        <WidgetCard key={id} icon={Users} title="Seat Management" span={span} delay={400} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}
          action={<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90" style={{ backgroundColor: "#D4AF37" }}><UserPlus size={13} /> Invite member</button>}
        >
          <div>
            <div className="flex items-center gap-6 mb-5">
              <div>
                <p className="text-2xl font-black text-white">{ctx.liveSeatMembers.length}</p>
                <p className="text-[10px] text-zinc-500 font-medium">of {ctx.entitlements.maxSeats} seats used</p>
              </div>
              <div className="h-10 w-px bg-zinc-800" />
              <div>
                <p className="text-2xl font-black text-emerald-600">{ctx.liveSeatMembers.filter((m) => m.active).length}</p>
                <p className="text-[10px] text-zinc-500 font-medium">Active now</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider pb-3 pr-4">Name</th>
                    <th className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider pb-3 pr-4">Email</th>
                    <th className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider pb-3 pr-4">Role</th>
                    <th className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ctx.liveSeatMembers.map((m, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 pr-4 text-xs font-semibold text-white">{m.name}</td>
                      <td className="py-3 pr-4 text-xs text-zinc-400">{m.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${m.role === "Owner" ? "bg-[#D4AF37]/10 text-[#D4AF37]" : m.role === "Admin" ? "bg-[#6366F1]/10 text-[#6366F1]" : "bg-zinc-800 text-zinc-400"}`}>{m.role}</span>
                      </td>
                      <td className="py-3">
                        <span className={`flex items-center gap-1.5 text-[10px] font-medium ${m.active ? "text-emerald-600" : "text-zinc-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${m.active ? "bg-emerald-500" : "bg-zinc-600"}`} />{m.active ? "Online" : "Offline"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ctx.liveSeatMembers.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-xs text-zinc-500">No seat members found for this organization</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </WidgetCard>
      );

    case "upgrade":
      return (
        <WidgetCard key={id} icon={Zap} title="Unlock more power" span={span} delay={400} color={widgetColor} onSetSize={handleSetSize} size={widgetSize}>
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#D4AF371A" }}><Zap size={24} style={{ color: "#D4AF37" }} /></div>
            <p className="text-sm font-bold text-white mb-2">Upgrade to Business</p>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">Get seat management, Project Hub, advanced analytics, and 30,000 credits per month.</p>
            <Link href="/plans?plan=business&billing=monthly" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02]" style={{ backgroundColor: "#D4AF37" }}>
              View plans <ArrowRight size={13} />
            </Link>
          </div>
        </WidgetCard>
      );

    default:
      return null;
  }
}
