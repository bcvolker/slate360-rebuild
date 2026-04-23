"use client";

import { useState } from "react";
import {
  MapPin,
  Building2,
  Palette,
  FileText,
  Check,
  Sparkles,
  Camera,
  FileImage,
  FolderOpen,
  Layers,
  Globe,
  Mic,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Types & Data
   ───────────────────────────────────────────────────────────────── */

type AppId = "site-walk" | "360-tours" | "design-studio" | "content-studio";

interface App {
  id: AppId;
  label: string;
  icon: typeof MapPin;
  tagline: string;
  features: string[];
}

const APPS: App[] = [
  {
    id: "site-walk",
    label: "Site Walk",
    icon: MapPin,
    tagline: "Capture conditions, document observations, and produce reports as you walk the job.",
    features: [
      "Capture project context in real time",
      "Geolocated, time-stamped records",
      "AI-powered transcription & formatting",
      "Instant punch lists & proposals",
      "Share with your team in minutes",
      "Works offline on mobile",
    ],
  },
  {
    id: "360-tours",
    label: "360 Tours",
    icon: Building2,
    tagline: "Create immersive 360 walkthroughs with hotspots and branded share links.",
    features: [
      "Drag-and-drop tour creation",
      "Interactive hotspots & annotations",
      "Embed anywhere with one link",
      "Client portal auto-generation",
      "Analytics & view tracking",
      "White-label branding",
    ],
  },
  {
    id: "design-studio",
    label: "Design Studio",
    icon: Palette,
    tagline: "Review plans, generate 3D models, and work through design decisions collaboratively.",
    features: [
      "GLB / glTF model support",
      "Interactive rotate, zoom & pan",
      "Client-shareable model links",
      "Annotation & markup tools",
      "Before / after comparisons",
      "Version history tracking",
    ],
  },
  {
    id: "content-studio",
    label: "Content Studio",
    icon: FileText,
    tagline: "Edit video, organize project media, and produce branded deliverables from one workspace.",
    features: [
      "Photo, video & document library",
      "Collection-based organization",
      "Client-shareable galleries",
      "Bulk upload & tagging",
      "Smart search & filters",
      "CDN-powered delivery",
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────
   Mock Viewer Content per App
   ───────────────────────────────────────────────────────────────── */

function SiteWalkViewer() {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Browser chrome */}
      <div
        className="rounded-xl overflow-hidden border shadow-xl flex flex-col"
        style={{ borderColor: "#E2E8F0" }}
      >
        {/* Window bar */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
        >
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <div
            className="ml-3 flex-1 rounded-md px-3 py-1 text-xs"
            style={{ backgroundColor: "#E2E8F0", color: "#64748B" }}
          >
            slate360.app / site-walk
          </div>
        </div>

        {/* App UI mock */}
        <div className="p-5" style={{ backgroundColor: "#FFFFFF" }}>
          {/* Photo skeleton */}
          <div
            className="relative rounded-lg overflow-hidden mb-4 flex items-center justify-center"
            style={{ backgroundColor: "#F1F5F9", height: "140px" }}
          >
            <div className="flex flex-col items-center gap-2" style={{ color: "#94A3B8" }}>
              <Camera className="h-8 w-8" />
              <span className="text-xs font-medium">Site photo captured</span>
            </div>
            {/* Location badge */}
            <div
              className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{ backgroundColor: "#EFF6FF", color: "#3B82F6" }}
            >
              <MapPin className="h-3 w-3" />
              34.052°N, 118.243°W · 2:14 PM
            </div>
          </div>

          {/* AI transcription box */}
          <div
            className="rounded-xl border p-4 mb-4"
            style={{ borderColor: "#DBEAFE", backgroundColor: "#EFF6FF" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "#3B82F6" }} />
              <span className="text-xs font-semibold" style={{ color: "#3B82F6" }}>
                Format with AI
              </span>
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                style={{ backgroundColor: "#3B82F6", color: "#fff" }}
              >
                Live
              </span>
            </div>
            <div className="space-y-1.5">
              {["North exterior facade showing efflorescence on brick courses 3–5", "Windows sealed but no weep holes visible — flag for architect review", "Roof drain partially blocked — schedule clearing before rain season"].map((line, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs"
                  style={{ color: "#334155" }}
                >
                  <span
                    className="mt-0.5 flex-shrink-0 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "#3B82F6" }}
                  />
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Feature bullets */}
          <div className="space-y-1.5">
            {["Punch list auto-generated", "Report exported as PDF", "Shared via SlateDrop link"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs" style={{ color: "#475569" }}>
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#DCFCE7" }}
                >
                  <Check className="h-2.5 w-2.5" style={{ color: "#16A34A" }} />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToursViewer() {
  return (
    <div
      className="rounded-xl border overflow-hidden shadow-xl flex flex-col"
      style={{ borderColor: "#E2E8F0" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
      >
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <div
          className="ml-3 flex-1 rounded-md px-3 py-1 text-xs"
          style={{ backgroundColor: "#E2E8F0", color: "#64748B" }}
        >
          slate360.app / tours / project-alpha
        </div>
      </div>
      <div className="p-5" style={{ backgroundColor: "#0B0F15" }}>
        {/* 360 panorama mock */}
        <div
          className="relative rounded-lg flex items-center justify-center mb-4"
          style={{ height: "160px", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)" }}
        >
          <Globe className="h-12 w-12" style={{ color: "rgba(255,255,255,0.2)" }} />
          <div
            className="absolute bottom-3 left-3 right-3 flex items-center justify-between"
          >
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{ backgroundColor: "rgba(59,130,246,0.2)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              Drag to explore — 360°
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#94A3B8" }}
            >
              12 scenes
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Lobby", "Level 2", "Roof Deck"].map((scene, i) => (
            <div
              key={scene}
              className="rounded-lg p-2.5 text-center text-[11px] font-medium cursor-pointer transition-colors"
              style={{
                backgroundColor: i === 0 ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                color: i === 0 ? "#93C5FD" : "#64748B",
                border: i === 0 ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {scene}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesignStudioViewer() {
  return (
    <div
      className="rounded-xl border overflow-hidden shadow-xl flex flex-col"
      style={{ borderColor: "#E2E8F0" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
      >
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <div
          className="ml-3 flex-1 rounded-md px-3 py-1 text-xs"
          style={{ backgroundColor: "#E2E8F0", color: "#64748B" }}
        >
          slate360.app / design-studio / csb-stadium
        </div>
      </div>
      <div className="p-5" style={{ backgroundColor: "#0F172A" }}>
        {/* 3D viewport mock */}
        <div
          className="relative rounded-lg flex items-center justify-center mb-4"
          style={{
            height: "160px",
            background: "radial-gradient(ellipse at center, #1e3a5f 0%, #0B0F15 70%)",
          }}
        >
          {/* Wireframe grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#3B82F6" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <Layers className="h-10 w-10 relative z-10" style={{ color: "rgba(147,197,253,0.5)" }} />
          <div
            className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-medium"
            style={{ backgroundColor: "rgba(59,130,246,0.2)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.3)" }}
          >
            Rotate & zoom — 3D
          </div>
        </div>
        <div className="flex gap-2">
          {["Materials", "Annotations", "History"].map((tool) => (
            <div
              key={tool}
              className="flex-1 rounded-lg py-2 text-center text-[11px] font-medium"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                color: "#64748B",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {tool}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentStudioViewer() {
  return (
    <div
      className="rounded-xl border overflow-hidden shadow-xl flex flex-col"
      style={{ borderColor: "#E2E8F0" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
      >
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-400" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <div
          className="ml-3 flex-1 rounded-md px-3 py-1 text-xs"
          style={{ backgroundColor: "#E2E8F0", color: "#64748B" }}
        >
          slate360.app / content-studio
        </div>
      </div>
      <div className="p-5" style={{ backgroundColor: "#ffffff" }}>
        {/* Media grid mock */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg aspect-square flex items-center justify-center relative overflow-hidden"
              style={{
                backgroundColor: i % 3 === 0 ? "#EFF6FF" : i % 3 === 1 ? "#F8FAFC" : "#F0FDF4",
              }}
            >
              {i % 2 === 0 ? (
                <FileImage className="h-5 w-5" style={{ color: "#94A3B8" }} />
              ) : (
                <FolderOpen className="h-5 w-5" style={{ color: "#94A3B8" }} />
              )}
              {i === 2 && (
                <div
                  className="absolute top-1 right-1 rounded-full w-2 h-2"
                  style={{ backgroundColor: "#3B82F6" }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-lg border px-3 py-2 text-xs"
            style={{ borderColor: "#E2E8F0", color: "#94A3B8", backgroundColor: "#F8FAFC" }}
          >
            Search media library...
          </div>
          <div
            className="rounded-lg px-3 py-2 text-xs font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: "#3B82F6" }}
          >
            Upload
          </div>
        </div>
      </div>
    </div>
  );
}

const VIEWERS: Record<AppId, React.ReactNode> = {
  "site-walk": <SiteWalkViewer />,
  "360-tours": <ToursViewer />,
  "design-studio": <DesignStudioViewer />,
  "content-studio": <ContentStudioViewer />,
};

/* ─────────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────────── */

export function AppShowcase() {
  const [activeId, setActiveId] = useState<AppId>("site-walk");
  const activeApp = APPS.find((a) => a.id === activeId)!;

  return (
    <section
      id="apps"
      className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="text-center mb-14">
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#3B82F6" }}
          >
            The App Ecosystem
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight text-balance"
            style={{ color: "#0F172A" }}
          >
            One platform. Four connected apps.
          </h2>
          <p
            className="mt-4 text-lg max-w-2xl mx-auto text-pretty leading-relaxed"
            style={{ color: "#475569" }}
          >
            Start with one tool and expand as your workflow grows — every app shares
            projects, files, and permissions.
          </p>
        </div>

        {/* Bento viewer — two columns */}
        <div
          className="rounded-2xl border overflow-hidden shadow-xl"
          style={{ borderColor: "#E2E8F0" }}
        >
          <div className="grid lg:grid-cols-[280px_1fr]">
            {/* LEFT — tab menu */}
            <div
              className="border-r"
              style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}
            >
              {/* Menu header */}
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "#E2E8F0" }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                  Apps
                </p>
              </div>

              {/* Tabs */}
              <nav className="p-3 flex flex-col gap-1" aria-label="App selector">
                {APPS.map((app) => {
                  const Icon = app.icon;
                  const isActive = app.id === activeId;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setActiveId(app.id)}
                      className="group w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all"
                      style={{
                        backgroundColor: isActive ? "#EFF6FF" : "transparent",
                        borderLeft: isActive ? "3px solid #3B82F6" : "3px solid transparent",
                        color: isActive ? "#1D4ED8" : "#475569",
                      }}
                      aria-pressed={isActive}
                    >
                      <Icon
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: isActive ? "#3B82F6" : "#94A3B8" }}
                      />
                      <span className="text-sm font-medium">{app.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Feature list for active app — shown below tabs on mobile, desktop left panel */}
              <div
                className="hidden lg:block px-5 pt-4 pb-5 border-t"
                style={{ borderColor: "#E2E8F0" }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#94A3B8" }}>
                  Included
                </p>
                <ul className="space-y-2">
                  {activeApp.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "#475569" }}>
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: "#3B82F6" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* RIGHT — viewer */}
            <div
              className="p-6 lg:p-10 flex flex-col justify-start gap-6"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              {/* App title + tagline */}
              <div>
                <h3
                  className="text-xl font-bold mb-1"
                  style={{ color: "#0F172A" }}
                >
                  {activeApp.label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                  {activeApp.tagline}
                </p>
              </div>

              {/* Dynamic mock viewer */}
              <div className="w-full max-w-lg">
                {VIEWERS[activeId]}
              </div>

              {/* Mobile-only feature list */}
              <div className="lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#94A3B8" }}>
                  Included
                </p>
                <ul className="grid grid-cols-2 gap-2">
                  {activeApp.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "#475569" }}>
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: "#3B82F6" }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
