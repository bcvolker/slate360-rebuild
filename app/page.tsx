"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ChevronRight,
  X,
  Maximize2,
  Check,
  ArrowRight,
  Cpu,
  Users,
  ScanLine,
  FolderOpen,
} from "lucide-react";

/* ── 3D model (client-only) ────────────────────────────── */
const ModelViewer = dynamic(() => import("@/components/ModelViewerClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Loading 3D…</span>
    </div>
  ),
});

/* ── 7 platform cards (exact dashboard sidebar order) ──── */
const platforms = [
  {
    key: "design-studio",
    icon: "✏️",
    label: "Design",
    title: "Design Studio",
    desc: "Context-aware 3D modeling, 2D plan markup, fabrication prep, and version control — one workspace that adapts to your task.",
    href: "/features/design-studio",
    accent: "#FF4D00",
    highlight: true,
  },
  {
    key: "project-hub",
    icon: "📋",
    label: "Manage",
    title: "Project Hub",
    desc: "Command center for every project — RFIs, submittals, budgets, schedules, and team coordination in one place.",
    href: "/features/project-hub",
    accent: "#1E3A8A",
  },
  {
    key: "content-studio",
    icon: "🎨",
    label: "Create",
    title: "Content Studio",
    desc: "Create marketing materials, client presentations, and polished deliverables directly from your project data.",
    href: "/features/content-studio",
    accent: "#FF4D00",
  },
  {
    key: "360-tour-builder",
    icon: "🔭",
    label: "Visualize",
    title: "360 Tour Builder",
    desc: "Capture and share immersive 360° walkthroughs of any site, structure, or space. Embed anywhere.",
    href: "/features/360-tour-builder",
    accent: "#1E3A8A",
  },
  {
    key: "geospatial-robotics",
    icon: "🛰️",
    label: "Survey",
    title: "Geospatial & Robotics",
    desc: "Drone mapping, photogrammetry, LiDAR point clouds, and volumetric calculations — fully automated.",
    href: "/features/geospatial-robotics",
    accent: "#FF4D00",
  },
  {
    key: "virtual-studio",
    icon: "🎬",
    label: "Present",
    title: "Virtual Studio",
    desc: "Photorealistic renderings, fly-through animations, and client-ready presentations from your 3D models.",
    href: "/features/virtual-studio",
    accent: "#1E3A8A",
  },
  {
    key: "analytics-reports",
    icon: "📊",
    label: "Analyze",
    title: "Analytics & Reports",
    desc: "Project dashboards, credit consumption trends, portfolio-level insights, and exportable reports.",
    href: "/features/analytics-reports",
    accent: "#FF4D00",
  },
];

/* ── "More powerful tools" cards ────────────────────────── */
const moreTools = [
  {
    icon: <FolderOpen size={22} />,
    title: "SlateDrop",
    desc: "Mac Finder-style file system. Drag & drop, right-click Secure Send, auto-project folders, ZIP closeout.",
    href: "/features/slatedrop",
  },
  {
    icon: <Cpu size={22} />,
    title: "GPU-Powered Processing",
    desc: "Server-side rendering, file conversion, and heavy computation — offloaded so your machine stays fast.",
  },
  {
    icon: <Users size={22} />,
    title: "Easy Collaboration & Sharing",
    desc: "Share links, comment threads, real-time co-editing, and permission-based access for every stakeholder.",
  },
  {
    icon: <ScanLine size={22} />,
    title: "Digital Twin Creation",
    desc: "Gaussian Splatting & NeRF options to build photorealistic digital twins from photos or LiDAR scans.",
  },
];

/* ── Pricing tiers ──────────────────────────────────────── */
const plans = [
  {
    name: "Creator",
    price: "$79",
    annualPrice: "$66",
    desc: "For visual content creators and solo operators.",
    features: [
      "360 Tour Builder",
      "Virtual Studio",
      "40 GB storage",
      "6,000 credits/mo",
    ],
  },
  {
    name: "Model",
    price: "$199",
    annualPrice: "$166",
    desc: "For advanced modelers, architects, and drone operators.",
    features: [
      "Design Studio",
      "Geospatial & Robotics",
      "150 GB storage",
      "15,000 credits/mo",
    ],
    highlight: true,
  },
  {
    name: "Business",
    price: "$499",
    annualPrice: "$416",
    desc: "Full platform access for teams.",
    features: [
      "All modules",
      "Project Hub",
      "750 GB storage",
      "30,000 credits/mo",
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   ViewerCard — inline viewer with Interact / Expand
   ═══════════════════════════════════════════════════════════ */
function ViewerCard({
  children,
  onInteract,
  onExpand,
  interacted,
}: {
  children: React.ReactNode;
  onInteract: () => void;
  onExpand: () => void;
  interacted: boolean;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-lg flex flex-col">
      <div className="relative w-full aspect-[4/3] sm:aspect-video bg-gray-100 overflow-hidden">
        {children}
        {/* Expand — top-right */}
        <button
          onClick={onExpand}
          className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/90 hover:bg-white text-gray-700 border border-gray-200 shadow-sm transition-all hover:shadow backdrop-blur-sm z-10"
        >
          <Maximize2 size={11} /> Expand
        </button>
      </div>
      {/* Bottom bar */}
      <div className="px-4 py-3 flex items-center justify-end bg-white">
        <button
          onClick={onInteract}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white transition-all hover:opacity-90 hover:scale-105"
          style={{ backgroundColor: "#FF4D00" }}
        >
          {interacted ? "Reset" : "Interact"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ViewerModal — 65% on desktop, 90% on mobile
   ═══════════════════════════════════════════════════════════ */
function ViewerModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col w-[90vw] h-[90vh] sm:w-[65vw] sm:h-[65vh] max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 relative min-h-0">{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HomePage
   ═══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [interact360, setInteract360] = useState(false);
  const [interact3D, setInteract3D] = useState(false);
  const [modal360, setModal360] = useState(false);
  const [modal3D, setModal3D] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-white min-h-screen text-gray-900 antialiased">
      <Navbar />

      {/* ────── HERO — full viewport ────── */}
      <section className="min-h-screen flex items-center pt-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center py-12 lg:py-0">
          {/* Left: headline + CTAs */}
          <div className="max-w-xl">
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.04] mb-6"
              style={{ color: "#1E3A8A" }}
            >
              See it. Experience it.
              <br />
              <span style={{ color: "#FF4D00" }}>Own it.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-8">
              Manage building projects administratively and visually — one
              elegant platform for professionals who build, design, and deliver.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base text-white transition-all hover:opacity-90 hover:scale-105"
                style={{ backgroundColor: "#FF4D00" }}
              >
                Start free trial <ChevronRight size={16} />
              </Link>
              <Link
                href="/plans"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base text-gray-700 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                View pricing
              </Link>
            </div>
          </div>

          {/* Right: side-by-side viewers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 360 Viewer */}
            <ViewerCard
              interacted={interact360}
              onInteract={() => setInteract360((v) => !v)}
              onExpand={() => setModal360(true)}
            >
              {interact360 ? (
                <iframe
                  src={`https://cdn.pannellum.org/2.5/pannellum.htm#panorama=${encodeURIComponent(
                    "/uploads/pletchers.jpg"
                  )}&autoLoad=true&showControls=true&compass=false`}
                  className="w-full h-full border-0"
                  allowFullScreen
                  title="360 panorama"
                />
              ) : (
                <div
                  className="w-full h-full bg-cover bg-center relative cursor-pointer group"
                  style={{ backgroundImage: "url('/uploads/pletchers.jpg')" }}
                  onClick={() => setInteract360(true)}
                >
                  <div className="absolute inset-0 bg-[#1E3A8A]/20 group-hover:bg-[#1E3A8A]/10 transition-colors flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
                      <span className="text-2xl">🔭</span>
                    </div>
                  </div>
                </div>
              )}
            </ViewerCard>

            {/* 3D Viewer */}
            <ViewerCard
              interacted={interact3D}
              onInteract={() => setInteract3D((v) => !v)}
              onExpand={() => setModal3D(true)}
            >
              {interact3D && mounted ? (
                <ModelViewer
                  src="/uploads/csb-stadium-model.glb"
                  alt="3D building model"
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "transparent",
                  }}
                  cameraOrbit="45deg 65deg 105%"
                  shadowIntensity={0.4}
                  shadowSoftness={1}
                  showGround
                />
              ) : (
                <div
                  className="w-full h-full bg-gradient-to-br from-slate-100 to-gray-50 relative cursor-pointer group flex items-center justify-center"
                  onClick={() => setInteract3D(true)}
                >
                  <div className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center">
                    <span className="text-2xl">🏗️</span>
                  </div>
                </div>
              )}
            </ViewerCard>
          </div>
        </div>
      </section>

      {/* ────── THE PLATFORM — 7 cards ────── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}
            >
              Everything in one platform
            </span>
            <h2
              className="text-4xl sm:text-5xl font-black tracking-tight"
              style={{ color: "#1E3A8A" }}
            >
              The Platform
            </h2>
            <p className="text-gray-500 mt-4 text-lg max-w-xl mx-auto">
              Seven integrated modules. One login. Zero context switching.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {platforms.map((p) => (
              <Link
                key={p.key}
                href={p.href}
                className={`group relative p-6 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 block ${
                  p.highlight
                    ? "border-[#FF4D00]/30 bg-white shadow-sm ring-1 ring-[#FF4D00]/10"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {p.highlight && (
                  <span
                    className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: "#FF4D00" }}
                  >
                    Featured
                  </span>
                )}
                <div className="text-3xl mb-4">{p.icon}</div>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest mb-1 block"
                  style={{ color: p.accent }}
                >
                  {p.label}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#1E3A8A] transition-colors">
                  {p.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {p.desc}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-sm font-semibold transition-all group-hover:gap-2"
                  style={{ color: p.accent }}
                >
                  Learn more <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ────── MORE POWERFUL TOOLS ────── */}
      <section className="py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-4xl sm:text-5xl font-black tracking-tight"
              style={{ color: "#1E3A8A" }}
            >
              More powerful tools
            </h2>
            <p className="text-gray-500 mt-4 text-lg max-w-xl mx-auto">
              Everything else that makes Slate360 the most complete platform for
              professionals who build.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {moreTools.map((t) => (
              <div
                key={t.title}
                className="group p-6 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}
                >
                  {t.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-[#1E3A8A] transition-colors">
                  {t.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t.desc}
                </p>
                {t.href && (
                  <Link
                    href={t.href}
                    className="inline-flex items-center gap-1 text-sm font-semibold mt-3 transition-all group-hover:gap-2"
                    style={{ color: "#FF4D00" }}
                  >
                    Learn more <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── PRICING TEASER ────── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-4xl sm:text-5xl font-black tracking-tight"
              style={{ color: "#1E3A8A" }}
            >
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500 mt-4 text-lg max-w-lg mx-auto">
              Credits are generous. Storage is real. No surprise bills.
            </p>
            <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 mt-6">
              {(["monthly", "annual"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    billing === b
                      ? "bg-gray-900 text-white shadow"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {b === "monthly" ? "Monthly" : "Annual (save 17%)"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 relative ${
                  plan.highlight
                    ? "border-2 border-[#FF4D00] bg-white shadow-xl"
                    : "border border-gray-200 bg-white"
                }`}
              >
                {plan.highlight && (
                  <span
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: "#FF4D00" }}
                  >
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-500 mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span
                    className="text-4xl font-black"
                    style={{ color: "#1E3A8A" }}
                  >
                    {billing === "annual" ? plan.annualPrice : plan.price}
                  </span>
                  <span className="text-gray-400 text-sm">/mo</span>
                </div>
                <ul className="space-y-2.5 mb-7">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <Check
                        size={14}
                        style={{ color: "#FF4D00" }}
                        className="flex-shrink-0"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`flex items-center justify-center w-full py-3 rounded-full text-sm font-semibold transition-all hover:opacity-90 hover:scale-105 ${
                    plan.highlight
                      ? "text-white"
                      : "border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                  style={plan.highlight ? { backgroundColor: "#FF4D00" } : {}}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/plans"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#FF4D00] transition-colors"
            >
              See full pricing & Enterprise <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ────── CTA ────── */}
      <section
        className="py-24 px-4 sm:px-6 text-white"
        style={{ backgroundColor: "#1E3A8A" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
            Your next project, fully managed.
          </h2>
          <p className="text-blue-200 text-lg mb-10 leading-relaxed">
            Join professionals who manage, visualize, and deliver projects with
            Slate360. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full font-semibold text-base text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF4D00" }}
            >
              Start free trial <ChevronRight size={16} />
            </Link>
            <Link
              href="/features/design-studio"
              className="inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full font-semibold text-base text-white border border-white/30 hover:bg-white/10 transition-all"
            >
              Explore Design Studio
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* ────── 360 MODAL ────── */}
      <ViewerModal
        open={modal360}
        onClose={() => setModal360(false)}
        title="360° Site Tour"
      >
        <iframe
          src={`https://cdn.pannellum.org/2.5/pannellum.htm#panorama=${encodeURIComponent(
            "/uploads/pletchers.jpg"
          )}&autoLoad=true&showControls=true&compass=false`}
          className="w-full h-full border-0"
          allowFullScreen
          title="360 panorama fullscreen"
        />
      </ViewerModal>

      {/* ────── 3D MODAL ────── */}
      <ViewerModal
        open={modal3D}
        onClose={() => setModal3D(false)}
        title="3D Building Model"
      >
        {mounted && (
          <ModelViewer
            src="/uploads/csb-stadium-model.glb"
            alt="3D building model fullscreen"
            style={{ width: "100%", height: "100%", background: "transparent" }}
            cameraOrbit="45deg 65deg 105%"
            shadowIntensity={0.4}
            shadowSoftness={1}
            showGround
          />
        )}
      </ViewerModal>
    </div>
  );
}
