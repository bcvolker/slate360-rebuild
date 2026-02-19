import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const features = [
  {
    key: "design-studio",
    label: "Design",
    accent: "#FF4D00",
    title: "Design Studio",
    description:
      "Professional-grade composition environment with sports-specific templates, brand kit management, and one-click exports. No design degree required.",
    href: "/features/design-studio",
  },
  {
    key: "project-hub",
    label: "Manage",
    accent: "#60a5fa",
    title: "Project Hub",
    description:
      "Centralized campaign management — assets, briefs, milestones, RFIs, submittals, and team roles in one clean workspace.",
    href: "/features/project-hub",
  },
  {
    key: "slatedrop",
    label: "Distribute",
    accent: "#FF4D00",
    title: "SlateDrop",
    description:
      "Finder-style file distribution with Secure Send, auto-folders per project, and full upload audit trails for external stakeholders.",
    href: "/features/slatedrop",
  },
  {
    key: "360-capture",
    label: "Capture",
    accent: "#60a5fa",
    title: "360° Capture",
    description:
      "Immersive panoramic capture, stitching, and interactive tour publishing — all linked to your project documents.",
    href: "/features/360-capture",
  },
  {
    key: "analytics",
    label: "Measure",
    accent: "#FF4D00",
    title: "Real-Time Analytics",
    description:
      "Engagement metrics across every published asset, with branded PDF reports you can send directly to ownership.",
    href: "/features/analytics",
  },
  {
    key: "rendering",
    label: "Process",
    accent: "#60a5fa",
    title: "GPU Rendering",
    description:
      "Cloud GPU workers handle 3D optimization, 360° stitching, and format conversion — your laptop never slows down.",
    href: "/features/rendering",
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-black min-h-screen text-white antialiased">
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
          <h1 className="mt-4 text-5xl md:text-7xl font-black tracking-tight leading-none">
            Every tool. One platform.
          </h1>
          <p className="mt-6 text-white/50 text-xl leading-relaxed max-w-2xl mx-auto">
            From sideline capture to broadcast distribution — SLATE360 gives your
            team every tool they need to produce elite content, with zero broken handoffs.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/plans"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base transition-all hover:opacity-90 hover:scale-105"
              style={{ backgroundColor: "#FF4D00", color: "#fff" }}
            >
              Start Free Trial <ChevronRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base border border-white/20 hover:bg-white/5 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="pb-28 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Link
                key={f.key}
                href={f.href}
                className="group relative p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/25 transition-all duration-300 flex flex-col gap-5 min-h-[220px]"
              >
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full w-fit"
                  style={{ backgroundColor: f.accent + "22", color: f.accent }}
                >
                  {f.label}
                </span>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-3 text-white">{f.title}</h2>
                  <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold mt-auto"
                  style={{ color: f.accent }}
                >
                  Explore <ChevronRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-6 md:px-8 bg-zinc-950/50 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-black mb-4">Ready to get started?</h2>
          <p className="text-white/50 mb-8 text-lg">
            Start free. No credit card required.
          </p>
          <Link
            href="/plans"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-base transition-all hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: "#FF4D00", color: "#fff" }}
          >
            View Plans &amp; Pricing <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
