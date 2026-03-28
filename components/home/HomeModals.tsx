"use client";

import dynamic from "next/dynamic";
import { ZoomIn, ZoomOut, RotateCcw, Hand } from "lucide-react";
import { ViewerModal } from "./ViewerHelpers";
import { platforms } from "./home-data";

const ModelViewer = dynamic(() => import("@/components/ModelViewerClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Loading 3D…</span>
    </div>
  ),
});

function ModelControls({ wrapperId, defaultOrbit }: { wrapperId: string; defaultOrbit: string }) {
  return (
    <>
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 z-20">
        <button
          onClick={() => {
            const mv = document.querySelector(`#${wrapperId} model-viewer`) as Record<string, unknown> | null;
            if (mv) {
              const co = (mv as Record<string, (...args: unknown[]) => { theta: number; phi: number; radius: number }>).getCameraOrbit();
              co.radius *= 0.8;
              mv.cameraOrbit = `${co.theta}rad ${co.phi}rad ${co.radius}m`;
            }
          }}
          className="w-9 h-9 rounded-md bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center text-white transition-colors shadow-lg border border-white/10"
          title="Zoom in"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => {
            const mv = document.querySelector(`#${wrapperId} model-viewer`) as Record<string, unknown> | null;
            if (mv) {
              const co = (mv as Record<string, (...args: unknown[]) => { theta: number; phi: number; radius: number }>).getCameraOrbit();
              co.radius *= 1.2;
              mv.cameraOrbit = `${co.theta}rad ${co.phi}rad ${co.radius}m`;
            }
          }}
          className="w-9 h-9 rounded-md bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center text-white transition-colors shadow-lg border border-white/10"
          title="Zoom out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => {
            const mv = document.querySelector(`#${wrapperId} model-viewer`) as Record<string, unknown> | null;
            if (mv) mv.cameraOrbit = defaultOrbit;
          }}
          className="w-9 h-9 rounded-md bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center text-white transition-colors shadow-lg border border-white/10"
          title="Reset view"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm z-20 pointer-events-none">
        <span className="text-[11px] text-white/60 font-medium flex items-center gap-1.5">
          <Hand size={13} /> Click &amp; drag to orbit · Scroll to zoom
        </span>
      </div>
    </>
  );
}

export default function HomeModals({
  mounted,
  modal3D,
  setModal3D,
  modalCard,
  setModalCard,
}: {
  mounted: boolean;
  modal3D: boolean;
  setModal3D: (v: boolean) => void;
  modalCard: string | null;
  setModalCard: (v: string | null) => void;
}) {
  return (
    <>
      {/* Hero 3D Modal */}
      <ViewerModal
        open={modal3D}
        onClose={() => setModal3D(false)}
        title="3D Building Model"
      >
        <div className="relative w-full h-full" id="hero-modal-wrap">
          {mounted && (
            <ModelViewer
              src="/uploads/csb-stadium-model.glb"
              alt="3D building model fullscreen"
              style={{ width: "100%", height: "100%", background: "black" }}
              cameraOrbit="30deg 75deg 85%"
              shadowIntensity={1}
              shadowSoftness={0.8}
            />
          )}
          <ModelControls wrapperId="hero-modal-wrap" defaultOrbit="30deg 75deg 85%" />
        </div>
      </ViewerModal>

      {/* Feature Card Modal */}
      <ViewerModal
        open={modalCard !== null}
        onClose={() => setModalCard(null)}
        title={platforms.find((p) => p.key === modalCard)?.title ?? "Preview"}
      >
        {modalCard === "design-studio" && mounted && (
          <div className="relative w-full h-full" id="design-modal-wrap">
            <ModelViewer
              src="/uploads/csb-stadium-model.glb"
              alt="Design Studio"
              style={{ width: "100%", height: "100%", background: "black" }}
              cameraOrbit="30deg 75deg 85%"
              shadowIntensity={1}
              shadowSoftness={0.8}
            />
            <ModelControls wrapperId="design-modal-wrap" defaultOrbit="30deg 75deg 85%" />
          </div>
        )}
        {modalCard === "360-tour-builder" && mounted && (
          <iframe
            src={`https://cdn.pannellum.org/2.5/pannellum.htm#panorama=${encodeURIComponent(
              `${window.location.origin}/uploads/pletchers.jpg`
            )}&autoLoad=true`}
            className="w-full h-full border-0 block"
            allowFullScreen
            title="360 panorama"
          />
        )}
        {modalCard && modalCard !== "design-studio" && modalCard !== "360-tour-builder" && (
          <div className="w-full h-full bg-black flex flex-col items-center justify-center">
            <span className="text-7xl mb-4">
              {platforms.find((p) => p.key === modalCard)?.icon}
            </span>
            <p className="text-white/60 text-sm">Full preview coming soon</p>
          </div>
        )}
      </ViewerModal>
    </>
  );
}
