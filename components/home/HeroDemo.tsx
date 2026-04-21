"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Image } from "lucide-react";

const ModelViewerClient = dynamic(
  () => import("@/components/ModelViewerClient"),
  { ssr: false }
);
const PanoramaViewer = dynamic(
  () => import("@/components/home/PanoramaViewer"),
  { ssr: false }
);

type Tab = "model" | "panorama" | "video";

export default function HeroDemo() {
  const [active, setActive] = useState<Tab>("model");

  return (
    <div className="w-full">
      {/* Tab switcher */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setActive("model")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            active === "model"
              ? "bg-teal-soft text-teal border border-teal"
              : "bg-app-card border border-app text-muted-foreground hover:text-teal hover:border-teal"
          }`}
        >
          <Box className="h-3.5 w-3.5" />
          3D Model
        </button>
        <button
          onClick={() => setActive("panorama")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            active === "panorama"
              ? "bg-teal-soft text-teal border border-teal"
              : "bg-app-card border border-app text-muted-foreground hover:text-teal hover:border-teal"
          }`}
        >
          <Image className="h-3.5 w-3.5" />
          360° Tour
        </button>
        <button
          onClick={() => setActive("video")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            active === "video"
              ? "bg-teal-soft text-teal border border-teal"
              : "bg-app-card border border-app text-muted-foreground hover:text-teal hover:border-teal"
          }`}
        >
          <Box className="h-3.5 w-3.5" />
          Video
        </button>
      </div>

      {/* Viewer */}
      <div className="aspect-video rounded-lg overflow-hidden bg-background/50">
        {active === "model" ? (
          <ModelViewerClient
            src="/uploads/csb-stadium-model.glb"
            alt="Stadium 3D model"
            cameraOrbit="45deg 65deg 160%"
            shadowIntensity={1}
            shadowSoftness={1}
          />
        ) : active === "panorama" ? (
          <PanoramaViewer
            src="/uploads/pletchers.jpg"
            caption="Drag to look around — 360° panorama"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Video demo coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
