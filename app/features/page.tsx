"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight } from "lucide-react";

const features = [
  { key: "design-studio", icon: "✏️", label: "Design", title: "Design Studio", accent: "#FF4D00", highlight: true,
    desc: "Context-aware 3D modeling, 2D plan markup, fabrication prep, and version control in one workspace that adapts to your task.",
    href: "/features/design-studio" },
  { key: "project-hub", icon: "📋", label: "Manage", title: "Project Hub", accent: "#1E3A8A",
    desc: "Command center for every project — RFIs, submittals, budgets, schedules, and team coordination in one place.",
    href: "/features/project-hub" },
  { key: "content-studio", icon: "🎨", label: "Create", title: "Content Studio", accent: "#FF4D00",
    desc: "Branded reports, bid packages, social posts, and client microsites from your live project data.",
    href: "/features/content-studio" },
  { key: "360-tour-builder", icon: "🔭", label: "Visualize", title: "360 Tour Builder", accent: "#1E3A8A",
    desc: "Capture and share immersive 360° walkthroughs of any site or structure. Embed anywhere.",
    href: "/features/360-tour-builder" },
  { key: "geospatial-robotics", icon: "🛰️", label: "Survey", title: "Geospatial & Robotics", accent: "#FF4D00",
    desc: "Drone mapping, photogrammetry, LiDAR, and volumetric calculations — fully automated.",
    href: "/features/geospatial-robotics" },
  { key: "virtual-studio", icon: "🎬", label: "Present", title: "Virtual Studio", accent: "#1E3A8A",
    desc: "Photorealistic renderings, fly-through animations, and polished presentations from your models.",
    href: "/features/virtual-studio" },
  { key: "analytics-reports", icon: "📊", label: "Analyze", title: "Analytics & Reports", accent: "#FF4D00",
    desc: "Portfolio dashboards, credit trends, team activity, and exportable reports.",
    href: "/features/analytics-reports" },
  { key: "slatedrop", icon: "📂", label: "Organize", title: "SlateDrop", accent: "#1E3A8A",
    desc: "Finder-style file system for every project and tab. Drag, drop, right-click Secure Send.",
    href: "/features/slatedrop" },
];

export default function FeaturesPage() {
  return (
    <div className="bg-white min-h-screen text-gray-900 antialiased">
      <Navbar />
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4" style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}>
              The full platform
            </span>
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight" style={{ color: "#1E3A8A" }}>Platform Features</h1>
            <p className="text-gray-500 mt-4 text-lg max-w-xl mx-auto">Eight integrated modules. One login, zero context switching.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <Link key={f.key} href={f.href} className={`group p-6 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 block relative ${f.highlight ? "border-[#FF4D00]/30 bg-white shadow-sm ring-1 ring-[#FF4D00]/10" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                {f.highlight && <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#FF4D00" }}>Start here</span>}
                <div className="text-3xl mb-4">{f.icon}</div>
                <span className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: f.accent }}>{f.label}</span>
                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#1E3A8A] transition-colors">{f.title}</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{f.desc}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold transition-all group-hover:gap-2" style={{ color: f.accent }}>
                  Learn more <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
