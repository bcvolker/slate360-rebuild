"use client";

import { useState } from "react";
import { Play, Eye, Globe, Building2, Camera, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppItem } from "@/components/home/landing-data";

// ──────────────────────────────────────────────────────────────────────────────
// ROUTER — picks the right demo based on demoType
// ──────────────────────────────────────────────────────────────────────────────

export function InteractiveDemo({ app }: { app: AppItem }) {
  switch (app.demoType) {
    case "video":
      return <VideoDemo app={app} />;
    case "360":
      return <PanoramaDemo app={app} />;
    case "3d":
      return <ThreeDDemo app={app} />;
    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// VIDEO DEMO
// ──────────────────────────────────────────────────────────────────────────────

function VideoDemo({ app }: { app: AppItem }) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Card className="bg-glass border-glass shadow-glass overflow-hidden group">
      <div className="relative aspect-video">
        {isPlaying ? (
          <video
            src={app.demoUrl}
            className="w-full h-full object-cover"
            autoPlay
            controls
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <>
            <img
              src={app.demoPoster ?? app.demoUrl}
              alt={`${app.name} demo`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <button
                onClick={() => setIsPlaying(true)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-gold-glow transition-transform hover:scale-110"
                aria-label={`Play ${app.name} demo`}
              >
                <Play className="h-6 w-6 ml-1" />
              </button>
            </div>
          </>
        )}
        <Badge className="absolute top-4 left-4 bg-background/80 text-foreground border-border">
          <Camera className="mr-1 h-3 w-3" />
          Site Walk Demo
        </Badge>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 360 PANORAMA DEMO
// ──────────────────────────────────────────────────────────────────────────────

function PanoramaDemo({ app }: { app: AppItem }) {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  return (
    <Card className="bg-glass border-glass shadow-glass overflow-hidden">
      <div
        className="relative aspect-video cursor-grab active:cursor-grabbing select-none overflow-hidden"
        onMouseDown={(e) => { setIsDragging(true); setStartX(e.clientX); }}
        onMouseMove={(e) => {
          if (!isDragging) return;
          setRotation((r) => r + (e.clientX - startX) * 0.5);
          setStartX(e.clientX);
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div
          className="absolute inset-0 transition-transform duration-100"
          style={{
            backgroundImage: `url(${app.demoUrl})`,
            backgroundSize: "200% 100%",
            backgroundPosition: `${rotation % 100}% center`,
          }}
        />

        {/* Hotspots */}
        <div
          className="absolute top-1/3 transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${25 + (rotation % 50)}%` }}
        >
          <div className="h-8 w-8 rounded-full bg-primary/80 border-2 border-white flex items-center justify-center animate-pulse">
            <Eye className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
        <div
          className="absolute top-1/2 transform translate-x-1/2 -translate-y-1/2"
          style={{ right: `${25 - (rotation % 30)}%` }}
        >
          <div className="h-8 w-8 rounded-full bg-primary/80 border-2 border-white flex items-center justify-center animate-pulse">
            <Eye className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Drag to explore 360° view
          </p>
        </div>
        <Badge className="absolute top-4 left-4 bg-background/80 text-foreground border-border">
          <Building2 className="mr-1 h-3 w-3" />
          Interactive 360° Tour
        </Badge>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 3D BUILDING DEMO
// ──────────────────────────────────────────────────────────────────────────────

function ThreeDDemo({ app }: { app: AppItem }) {
  const [rotateY, setRotateY] = useState(0);
  const [rotateX, setRotateX] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  return (
    <Card className="bg-glass border-glass shadow-glass overflow-hidden">
      <div
        className="relative aspect-video cursor-grab active:cursor-grabbing select-none flex items-center justify-center overflow-hidden"
        style={{ perspective: "1000px" }}
        onMouseDown={(e) => { setIsDragging(true); setStartPos({ x: e.clientX, y: e.clientY }); }}
        onMouseMove={(e) => {
          if (!isDragging) return;
          setRotateY((y) => y + (e.clientX - startPos.x) * 0.5);
          setRotateX((x) => Math.max(-30, Math.min(30, x - (e.clientY - startPos.y) * 0.3)));
          setStartPos({ x: e.clientX, y: e.clientY });
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div
          className="relative w-48 h-64 transition-transform duration-100"
          style={{ transformStyle: "preserve-3d", transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-600 to-zinc-800 border border-primary/30" style={{ transform: "translateZ(40px)" }}>
            <div className="grid grid-cols-3 gap-2 p-4">
              {[...Array(9)].map((_, i) => <div key={i} className="aspect-square bg-primary/20 border border-primary/30" />)}
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-700 to-zinc-900" style={{ transform: "translateZ(-40px) rotateY(180deg)" }} />
          <div className="absolute top-0 left-0 w-20 h-full bg-gradient-to-b from-zinc-500 to-zinc-700 border-r border-primary/20" style={{ transform: "rotateY(-90deg) translateZ(0px)" }} />
          <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-b from-zinc-500 to-zinc-700 border-l border-primary/20" style={{ transform: "rotateY(90deg) translateZ(152px)" }} />
          <div className="absolute top-0 left-0 w-full h-20 bg-primary/30" style={{ transform: "rotateX(90deg) translateZ(0px)" }} />
        </div>

        <div className="absolute top-1/4 right-1/4 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
          <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-foreground">12.5m height</span>
        </div>

        <Badge className="absolute top-4 left-4 bg-background/80 text-foreground border-border">
          <Layers className="mr-1 h-3 w-3" />
          Interactive 3D Model
        </Badge>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-4 py-2">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Drag to rotate 3D model
          </p>
        </div>
      </div>
    </Card>
  );
}
