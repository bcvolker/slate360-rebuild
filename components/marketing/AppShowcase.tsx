"use client";

import { useState } from "react";
import { MapPin, Building2, Palette, FileText, Check, Sparkles, Camera, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

type AppTab = "site-walk" | "360-tours" | "design-studio" | "content-studio";

interface AppData {
  id: AppTab;
  label: string;
  icon: React.ElementType;
  tagline: string;
  features: string[];
  viewer: React.ReactNode;
}

/* ── Site Walk Viewer ─────────────────────────────────────── */
function SiteWalkViewer() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Mock photo + location bar */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <Camera className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Site photo — Level 3, Grid B4</span>
          <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
            GPS locked
          </span>
        </div>
        {/* Photo skeleton */}
        <div className="h-36 w-full bg-gradient-to-br from-slate-200 to-slate-300 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-2 h-10 w-10 rounded-lg bg-slate-300/60" />
              <div className="h-2 w-24 rounded bg-slate-300/60 mx-auto" />
            </div>
          </div>
          {/* Simulated annotation pin */}
          <div className="absolute left-1/3 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-blue-500 shadow-lg">
            <span className="text-[10px] font-bold text-white">1</span>
          </div>
        </div>
      </div>

      {/* AI Transcription box */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-semibold text-blue-700">Format with AI</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-blue-500">
            <Mic className="h-3 w-3" />
            Transcribing...
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded bg-blue-200" />
          <div className="h-2 w-5/6 rounded bg-blue-200" />
          <div className="h-2 w-4/6 rounded bg-blue-200" />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500">
            Convert to Punch List
          </button>
          <button className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50">
            Save Note
          </button>
        </div>
      </div>

      {/* Feature bullets */}
      <ul className="space-y-2">
        {[
          "Time-stamped & geolocated captures",
          "Voice-to-text observations",
          "Auto-generated punch lists",
          "Branded PDF reports in minutes",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
            <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 360 Tours Viewer ─────────────────────────────────────── */
function ToursViewer() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Panorama placeholder */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-700 to-slate-900 h-44">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Building2 className="mx-auto h-10 w-10 text-white/30" />
            <p className="mt-2 text-xs text-white/50">360° Panorama Viewer</p>
            <p className="text-[10px] text-white/30">Drag to explore</p>
          </div>
        </div>
        {/* Hotspot dots */}
        {[
          { top: "35%", left: "25%" },
          { top: "55%", left: "65%" },
          { top: "40%", left: "75%" },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/70 bg-blue-500/80"
            style={{ top: pos.top, left: pos.left }}
          >
            <span className="text-[9px] font-bold text-white">{i + 1}</span>
          </div>
        ))}
        {/* Floor plan thumbnail */}
        <div className="absolute bottom-3 right-3 h-14 w-20 rounded-lg border border-white/20 bg-white/10 p-1.5">
          <div className="h-full w-full rounded bg-white/20 flex items-center justify-center">
            <span className="text-[8px] text-white/60">Floor Plan</span>
          </div>
        </div>
      </div>

      {/* Tour metadata */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Scenes", value: "12" },
          { label: "Hotspots", value: "34" },
          { label: "Viewers", value: "28" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <p className="text-lg font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <ul className="space-y-2">
        {["Drag-and-drop tour creation", "Interactive hotspots & annotations", "Client portal auto-generation", "White-label branding"].map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
            <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Design Studio Viewer ─────────────────────────────────── */
function DesignStudioViewer() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* 3D model viewport */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 h-44">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-2 grid grid-cols-3 gap-1 w-16">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 w-full rounded-sm bg-white/10"
                  style={{ opacity: 0.2 + (i % 4) * 0.2 }}
                />
              ))}
            </div>
            <p className="text-xs text-white/50">3D Model Viewer</p>
            <p className="text-[10px] text-white/30">Rotate &amp; zoom</p>
          </div>
        </div>
        {/* Toolbar */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          {["⊕", "⊖", "⟳"].map((icon) => (
            <button
              key={icon}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xs text-white/70 transition hover:bg-white/20"
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Layers panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Layers</p>
        <div className="space-y-1.5">
          {["Structure", "MEP Systems", "Finishes", "Annotations"].map((layer, i) => (
            <div key={layer} className="flex items-center gap-2">
              <div className={cn("h-2.5 w-2.5 rounded-full", i === 0 ? "bg-blue-500" : i === 1 ? "bg-violet-500" : i === 2 ? "bg-amber-400" : "bg-slate-400")} />
              <span className="text-xs text-slate-700">{layer}</span>
              <div className="ml-auto h-1.5 w-12 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {["GLB / glTF model support", "Interactive rotate, zoom & pan", "Annotation & markup tools", "Version history tracking"].map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
            <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Content Studio Viewer ────────────────────────────────── */
function ContentStudioViewer() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Media grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { type: "photo", bg: "from-slate-200 to-slate-300" },
          { type: "photo", bg: "from-blue-100 to-blue-200" },
          { type: "video", bg: "from-violet-100 to-violet-200" },
          { type: "photo", bg: "from-amber-100 to-amber-200" },
          { type: "360", bg: "from-sky-200 to-sky-300" },
          { type: "doc", bg: "from-green-100 to-green-200" },
        ].map((item, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg bg-gradient-to-br ${item.bg} relative overflow-hidden border border-white/60`}
          >
            {item.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80">
                  <span className="ml-0.5 border-y-[5px] border-l-8 border-y-transparent border-l-slate-700" />
                </div>
              </div>
            )}
            {item.type === "360" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-bold text-sky-700">360°</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Search/filter bar */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-slate-400">Search 140 assets...</span>
        <div className="ml-auto flex gap-1.5">
          {["All", "Photos", "Video"].map((f) => (
            <span key={f} className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium", f === "All" ? "bg-blue-100 text-blue-700" : "text-slate-500")}>
              {f}
            </span>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {["Photo, video & document library", "Collection-based organization", "Client-shareable galleries", "CDN-powered delivery"].map((item) => (
          <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
            <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */
const APPS: AppData[] = [
  {
    id: "site-walk",
    label: "Site Walk",
    icon: MapPin,
    tagline: "Document field conditions with your phone. Turn site walks into branded reports in minutes.",
    features: [
      "Geolocated photo capture",
      "Voice-to-text observations",
      "AI-powered punch lists",
      "Branded PDF export",
      "Real-time team sharing",
      "Time-stamped audit trail",
    ],
    viewer: <SiteWalkViewer />,
  },
  {
    id: "360-tours",
    label: "360 Tours",
    icon: Building2,
    tagline: "Create immersive walkthroughs with hotspots and floor plans clients can explore remotely.",
    features: [
      "Drag-and-drop tour builder",
      "Interactive hotspots",
      "Embed anywhere",
      "Client portal generation",
      "Analytics & view tracking",
      "White-label branding",
    ],
    viewer: <ToursViewer />,
  },
  {
    id: "design-studio",
    label: "Design Studio",
    icon: Palette,
    tagline: "Review plans, present 3D models, and collaborate on design decisions in connected workspaces.",
    features: [
      "GLB / glTF model support",
      "Interactive 3D viewer",
      "Annotation tools",
      "Layer management",
      "Version history",
      "Client-shareable links",
    ],
    viewer: <DesignStudioViewer />,
  },
  {
    id: "content-studio",
    label: "Content Studio",
    icon: FileText,
    tagline: "Edit video, manage project media, and produce branded deliverables from one workspace.",
    features: [
      "Photo & video library",
      "Collection organization",
      "Shareable galleries",
      "Bulk upload & tagging",
      "Smart search & filters",
      "CDN-powered delivery",
    ],
    viewer: <ContentStudioViewer />,
  },
];

export default function AppShowcase() {
  const [activeTab, setActiveTab] = useState<AppTab>("site-walk");
  const active = APPS.find((a) => a.id === activeTab)!;
  const Icon = active.icon;

  return (
    <section id="apps" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600">
            The App Ecosystem
          </p>
          <h2 className="mb-4 text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            One platform. Every workflow.
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-slate-600">
            Start with the tools you need today. Every app shares projects, files, and permissions — so your
            workflow expands without losing context.
          </p>
        </div>

        {/* Bento Box: Left tabs + Right viewer */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-xl shadow-slate-200/60 lg:grid lg:grid-cols-[280px_1fr]">
          {/* Left: Tab menu */}
          <div className="border-b border-slate-200 bg-white p-4 lg:border-b-0 lg:border-r lg:p-6">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Apps
            </p>
            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-x-visible">
              {APPS.map((app) => {
                const TabIcon = app.icon;
                const isActive = activeTab === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => setActiveTab(app.id)}
                    className={cn(
                      "flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-left transition-all lg:min-w-0 lg:w-full",
                      isActive
                        ? "border-l-[3px] border-blue-600 bg-blue-50 pl-[13px] text-blue-700"
                        : "border-l-[3px] border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive ? "bg-blue-100" : "bg-slate-100"
                      )}
                    >
                      <TabIcon
                        className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-500")}
                      />
                    </div>
                    <span className="text-sm font-semibold">{app.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* CTA below tabs */}
            <div className="mt-6 hidden lg:block">
              <a
                href="/signup"
                className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Start Free Trial
              </a>
              <p className="mt-2 text-center text-xs text-slate-400">No credit card required</p>
            </div>
          </div>

          {/* Right: Viewer */}
          <div className="flex flex-col">
            {/* Viewer header */}
            <div className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{active.label}</h3>
                <p className="text-sm text-slate-500">{active.tagline}</p>
              </div>
              {/* Feature pills */}
              <div className="ml-auto hidden gap-2 xl:flex">
                {active.features.slice(0, 3).map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Dynamic mock UI */}
            <div className="flex-1 overflow-auto">{active.viewer}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
