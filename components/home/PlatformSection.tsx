"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Maximize2 } from "lucide-react";
import { platforms } from "./home-data";

const ModelViewer = dynamic(() => import("@/components/ModelViewerClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Loading 3D…</span>
    </div>
  ),
});

export default function PlatformSection({
  mounted,
  designInteractive,
  setDesignInteractive,
  tourInteractive,
  setTourInteractive,
  onExpandCard,
}: {
  mounted: boolean;
  designInteractive: boolean;
  setDesignInteractive: (fn: (v: boolean) => boolean) => void;
  tourInteractive: boolean;
  setTourInteractive: (fn: (v: boolean) => boolean) => void;
  onExpandCard: (key: string) => void;
}) {
  return (
    <section className="py-24 px-4 sm:px-6 bg-zinc-100">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
            style={{ backgroundColor: "#18181b1a", color: "#18181b" }}
          >
            Everything in one platform
          </span>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900">
            The Platform
          </h2>
          <p className="text-gray-500 mt-4 text-lg max-w-xl mx-auto">
            Eight integrated modules. One login. Zero context switching.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {platforms.map((p) => (
            <div
              key={p.key}
              className="group relative flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-gray-300 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="p-6 sm:w-1/2 flex flex-col justify-center relative">
                <div className="text-3xl mb-4">{p.icon}</div>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest mb-1 block"
                  style={{ color: p.accent }}
                >
                  {p.label}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#FF4D00] transition-colors">
                  {p.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-grow">
                  {p.desc}
                </p>
                <Link
                  href={p.href}
                  className="inline-flex items-center gap-1 text-sm font-semibold transition-all hover:gap-2 mt-auto"
                  style={{ color: p.accent }}
                >
                  Learn more <ArrowRight size={14} />
                </Link>
              </div>
              <div className="sm:w-1/2 min-h-[200px] sm:min-h-full bg-black flex items-center justify-center border-t sm:border-t-0 sm:border-l border-gray-800 relative overflow-hidden">
                <button
                  onClick={() => onExpandCard(p.key)}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-white/90 hover:bg-white text-gray-700 border border-gray-200 shadow-sm transition-all hover:shadow backdrop-blur-sm z-10"
                >
                  <Maximize2 size={10} /> Expand
                </button>
                {/* Viewer content */}
                {p.key === "design-studio" && mounted ? (
                  <ModelViewer
                    src="/uploads/csb-stadium-model.glb"
                    alt="Design Studio preview"
                    style={{ width: "100%", height: "100%", background: "transparent" }}
                    cameraOrbit="30deg 75deg 85%"
                    shadowIntensity={1}
                    shadowSoftness={0.8}
                    interactive={designInteractive}
                  />
                ) : p.key === "slate360-apps" ? (
                  <div className="w-full h-full flex items-center justify-center p-5">
                    <div className="grid grid-cols-3 gap-2.5 max-w-[220px]">
                      {[
                        { emoji: "🎨", name: "Design" },
                        { emoji: "📝", name: "Content" },
                        { emoji: "🔭", name: "360 Tour" },
                        { emoji: "🛰️", name: "Geo" },
                        { emoji: "🎬", name: "Virtual" },
                        { emoji: "📊", name: "Analytics" },
                        { emoji: "📁", name: "SlateDrop" },
                        { emoji: "📋", name: "Project" },
                        { emoji: "⚡", name: "GPU" },
                      ].map((a) => (
                        <div
                          key={a.name}
                          className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          <span className="text-2xl">{a.emoji}</span>
                          <span className="text-[9px] text-white/60 font-medium leading-tight text-center">
                            {a.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : p.key === "360-tour-builder" ? (
                  tourInteractive && mounted ? (
                    <iframe
                      src={`https://cdn.pannellum.org/2.5/pannellum.htm#panorama=${encodeURIComponent(
                        typeof window !== "undefined"
                          ? `${window.location.origin}/uploads/pletchers.jpg`
                          : "/uploads/pletchers.jpg"
                      )}&autoLoad=true`}
                      className="w-full h-full border-0 block"
                      allowFullScreen
                      title="360 panorama"
                    />
                  ) : (
                    <div className="w-full h-full overflow-hidden">
                      <div
                        className="w-[300%] h-full bg-cover bg-center animate-pan-360"
                        style={{ backgroundImage: "url('/uploads/pletchers.jpg')" }}
                      />
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-5xl opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-sm">
                      {p.icon}
                    </span>
                    <span className="text-xs text-white/40 font-medium">Preview</span>
                  </div>
                )}
                {p.key === "design-studio" && (
                  <button
                    onClick={() => setDesignInteractive((v) => !v)}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-white transition-all hover:opacity-90 z-10 backdrop-blur-sm bg-black/40 border border-white/20 hover:bg-black/60"
                  >
                    {designInteractive ? "🔒 Lock" : "⊕ Interact"}
                  </button>
                )}
                {p.key === "360-tour-builder" && (
                  <button
                    onClick={() => setTourInteractive((v) => !v)}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-white transition-all hover:opacity-90 z-10 backdrop-blur-sm bg-black/40 border border-white/20 hover:bg-black/60"
                  >
                    {tourInteractive ? "🔒 Lock" : "⊕ Interact"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
