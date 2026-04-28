"use client";

import { useEffect, useState } from "react";
import { isMarkupData, type MarkupShape } from "@/lib/site-walk/markup-types";
import type { LiveWalkItem } from "./live-walk-types";

const WIDTH = 1000;
const HEIGHT = 720;

type Props = { item: LiveWalkItem };

export function MarkupImagePreview({ item }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!item.file_id) return;
    let cancelled = false;
    fetch(`/api/slatedrop/download?fileId=${encodeURIComponent(item.file_id)}&mode=preview`, { cache: "no-store" })
      .then((response) => response.json() as Promise<{ url?: string }>)
      .then((data) => { if (!cancelled) setUrl(data.url ?? null); })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [item.file_id]);

  const shapes = isMarkupData(item.markup_data) ? item.markup_data.shapes : [];

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-slate-300 bg-slate-950">
      {url ? <img src={url} alt={item.title} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center p-6 text-center text-sm font-bold text-slate-300">Photo preview will appear when the capture upload is available.</div>}
      {shapes.length > 0 && (
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
          {shapes.map((shape) => renderShape(shape))}
        </svg>
      )}
    </div>
  );
}

function renderShape(shape: MarkupShape) {
  if (shape.kind === "rect") return <rect key={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
  if (shape.kind === "ellipse") return <ellipse key={shape.id} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
  if (shape.kind === "text") return <text key={shape.id} x={shape.x} y={shape.y} fill={shape.stroke} fontSize={shape.fontSize} fontWeight={800}>{shape.text}</text>;
  if (shape.kind === "freehand") return <polyline key={shape.id} points={shape.points.join(" ")} fill="none" stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  if (shape.kind === "line") return <line key={shape.id} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" />;
  if (shape.kind === "arrow") return <ArrowShape key={shape.id} shape={shape} />;
  return null;
}

function ArrowShape({ shape }: { shape: Extract<MarkupShape, { kind: "arrow" }> }) {
  const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
  const left = `${shape.x2 - shape.headSize * Math.cos(angle - Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle - Math.PI / 6)}`;
  const right = `${shape.x2 - shape.headSize * Math.cos(angle + Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle + Math.PI / 6)}`;
  return <g><line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" /><polyline points={`${left} ${shape.x2},${shape.y2} ${right}`} fill="none" stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></g>;
}
