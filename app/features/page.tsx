import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
  Camera,
  Layers,
  Zap,
  Globe,
  BarChart3,
  Share2,
  Shield,
  Cpu,
  FileVideo,
  ChevronRight,
} from "lucide-react";

const featureSections = [
  {
    category: "Capture",
    items: [
      {
        icon: Camera,
        title: "360° Photo & Video Capture",
        desc: "Full panoramic workflows designed around live event timelines. Shoot, stitch, and prep in one environment.",
      },
      {
        icon: FileVideo,
        title: "Multi-Camera Sync",
        desc: "Sync footage and metadata from multiple rigs. SLATE360 keeps everything aligned so your team doesn't have to.",
      },
    ],
  },
  {
    category: "Production",
    items: [
      {
        icon: Layers,
        title: "Design Studio",
        desc: "A full-featured composition environment with sports-specific templates, brand kit management, and one-click exports.",
      },
      {
        icon: Cpu,
        title: "GPU-Accelerated Rendering",
        desc: "Cloud GPU workers handle heavy processing so your laptop stays fast and your turnaround stays tight.",
      },
    ],
  },
  {
    category: "Distribution",
    items: [
      {
        icon: Zap,
        title: "SlateDrop Publishing",
        desc: "Drag and drop assets into a queue. SLATE360 handles sizing, formatting, and delivery to every channel.",
      },
      {
        icon: Share2,
        title: "Multi-Channel Push",
        desc: "Publish simultaneously to social, broadcast, and owned properties — with per-channel format optimization.",
      },
    ],
  },
  {
    category: "Management",
    items: [
      {
        icon: Globe,
        title: "Project Hub",
        desc: "All campaigns, briefs, timelines, and assets in one organized workspace. Built for ops teams and content leads.",
      },
      {
        icon: BarChart3,
        title: "Analytics Dashboard",
        desc: "Real-time performance data across every piece of published content. Know what's working as it happens.",
      },
      {
        icon: Shield,
        title: "Role-Based Access",
        desc: "Granular permission controls across your entire organization. The right people see the right things.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-20 px-6 md:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#FF4D00" }}
          >
            The Platform
          </span>
          <h1 className="mt-4 text-5xl md:text-7xl font-black tracking-tight">
            Every tool. One platform.
          </h1>
          <p className="mt-6 text-white/50 text-xl leading-relaxed">
            SLATE360 covers the complete sports content lifecycle — from raw
            capture all the way to published, performing media.
          </p>
        </div>
      </section>

      {/* Feature sections */}
      <section className="py-16 px-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-24">
          {featureSections.map((section) => (
            <div key={section.category}>
              <div className="flex items-center gap-4 mb-10">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#FF4D00" }}
                >
                  {section.category}
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: "#FF4D0022" }}
                    >
                      <item.icon size={20} style={{ color: "#FF4D00" }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-8 text-center">
        <h2 className="text-4xl font-black mb-6">
          Try every feature free for 14 days.
        </h2>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/plans"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: "#FF4D00", color: "#fff" }}
          >
            Start Free Trial
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/plans"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-200"
          >
            View Plans &amp; Pricing
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
