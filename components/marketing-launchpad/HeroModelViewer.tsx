"use client";

import dynamic from "next/dynamic";

const ModelViewerClient = dynamic(() => import("@/components/ModelViewerClient"), { ssr: false });

export function HeroModelViewer() {
  return (
    <div className="mt-6 aspect-[4/3] w-full max-w-none overflow-hidden rounded-xl border border-white/[0.05] bg-[#0B0F15] shadow-2xl lg:mt-0 lg:w-[60%]">
      <ModelViewerClient
        src="/uploads/csb-stadium-model.glb"
        alt="Interactive structural environment twin"
        cameraOrbit="45deg 65deg 107%"
        shadowIntensity={1}
        shadowSoftness={1}
      />
    </div>
  );
}
