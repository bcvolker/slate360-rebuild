"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronRight, Maximize2 } from "lucide-react";

const ModelViewer = dynamic(() => import("@/components/ModelViewerClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Loading 3D…</span>
    </div>
  ),
});

export default function HeroSection({
  mounted,
  heroInteractive,
  setHeroInteractive,
  onExpand3D,
}: {
  mounted: boolean;
  heroInteractive: boolean;
  setHeroInteractive: (fn: (v: boolean) => boolean) => void;
  onExpand3D: () => void;
}) {
  return (
    <section className="min-h-[100dvh] flex flex-col justify-center pt-16 pb-[max(env(safe-area-inset-bottom),1rem)] px-6 sm:px-10 lg:px-16 bg-gradient-to-br from-zinc-50/40 via-white to-orange-50/30">
      <div className="max-w-[88rem] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-14 items-center py-4 lg:py-0">
        {/* Left: headline + CTAs */}
        <div className="lg:col-span-6 max-w-2xl lg:pl-2">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.04] mb-4 sm:mb-6 text-zinc-900">
            See it. Experience it.
            <br />
            <span style={{ color: "#FF4D00" }}>Own it.</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-500 leading-relaxed mb-5 sm:mb-8">
            Manage building projects administratively and visually — one elegant
            platform for professionals who build, design, and deliver.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/signup?plan=creator&billing=monthly"
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

        {/* Right: hero vision viewer */}
        <div className="lg:col-span-6 flex items-center justify-center py-4 lg:py-0 lg:pr-2">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-black shadow-2xl w-full">
            <div className="relative w-full aspect-[16/9] sm:aspect-[4/3] lg:aspect-[16/10]">
              {mounted && (
                <ModelViewer
                  src="/uploads/csb-stadium-model.glb"
                  alt="3D building model"
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "transparent",
                  }}
                  cameraOrbit="30deg 75deg 85%"
                  shadowIntensity={1}
                  shadowSoftness={0.8}
                  interactive={heroInteractive}
                />
              )}
              <button
                onClick={onExpand3D}
                className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/90 hover:bg-white text-gray-700 border border-gray-200 shadow-sm backdrop-blur-sm z-10 transition-all hover:shadow"
              >
                <Maximize2 size={12} /> Expand
              </button>
              <button
                onClick={() => setHeroInteractive((v) => !v)}
                className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-90 z-10 backdrop-blur-sm bg-black/40 border border-white/20 hover:bg-black/60"
              >
                {heroInteractive ? "🔒 Lock" : "⊕ Interact"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
