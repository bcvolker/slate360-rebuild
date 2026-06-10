"use client";

import type { PointerEvent } from "react";
import type { MarkupData, MarkupShape } from "@/lib/site-walk/markup-types";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { buildShape, getShapeBounds, MARKUP_HEIGHT, MARKUP_WIDTH } from "@/components/site-walk/capture/markupCanvasGeometry";
import type { ResizeHandle } from "@/components/site-walk/capture/markupShapeEdits";
import { TextEditor } from "@/components/site-walk/capture/PhotoMarkupControls";
import { CaptureV2PhotoPins } from "./CaptureV2PhotoPins";
import { useCaptureV2PhotoCanvasState } from "./useCaptureV2PhotoCanvasState";

type Props = {
  imageUrl: string;
  markupEnabled: boolean;
  pinMode?: boolean;
  initialMarkup?: MarkupData | null;
  attachmentPins?: PhotoAttachmentPin[];
  onMarkupChange?: (markup: MarkupData) => void;
  onAttachmentPinsChange?: (pins: PhotoAttachmentPin[]) => void;
  onPlacePin?: (xPct: number, yPct: number) => void;
  onAttachHere?: (xPct: number, yPct: number) => void;
  onAttachFileToPin?: (pin: PhotoAttachmentPin) => void;
  onAttachPhotoToPin?: (pin: PhotoAttachmentPin) => void;
  openPinId?: string | null;
};

export function CaptureV2PhotoMarkupCanvas({
  imageUrl,
  markupEnabled,
  pinMode = false,
  initialMarkup,
  attachmentPins = [],
  onMarkupChange,
  onAttachmentPinsChange,
  onPlacePin,
  onAttachHere,
  onAttachFileToPin,
  onAttachPhotoToPin,
  openPinId,
}: Props) {
  const canvas = useCaptureV2PhotoCanvasState({
    imageUrl,
    markupEnabled,
    initialMarkup,
    onMarkupChange,
    pinMode,
    onPlacePin,
    onAttachHere,
  });

  return (
    <div className="h-full w-full text-left">
      <div
        ref={canvas.stageRef}
        data-disable-workspace-swipe="true"
        onWheel={canvas.handleWheel}
        onPointerDown={canvas.handlePointerDown}
        onPointerMove={canvas.handlePointerMove}
        onPointerUp={canvas.handlePointerUp}
        onPointerCancel={canvas.handlePointerUp}
        className={`relative h-full min-h-[360px] w-full touch-none overflow-hidden bg-black ${canvas.portrait ? "aspect-[3/4]" : "aspect-[4/3]"}`}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
      >
        <img
          src={imageUrl}
          alt=""
          onLoad={(event) => canvas.setPortrait(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth)}
          className="h-full max-h-[60vh] w-full max-w-full select-none object-contain"
          style={{ transform: `translate(${canvas.transform.x}px, ${canvas.transform.y}px) scale(${canvas.transform.scale})`, transformOrigin: "center" }}
          draggable={false}
        />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${MARKUP_WIDTH} ${MARKUP_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ transform: `translate(${canvas.transform.x}px, ${canvas.transform.y}px) scale(${canvas.transform.scale})`, transformOrigin: "center", pointerEvents: markupEnabled ? "auto" : "none" }}
        >
          {canvas.shapes.map((shape) => renderShape(shape, "", canvas.selectedId === shape.id, (event) => canvas.beginShapeDrag(event, shape)))}
          {renderSelectionBounds(canvas.shapes.find((shape) => shape.id === canvas.selectedId) ?? null, canvas.beginSelectionResize)}
          {canvas.draftStart && canvas.draftPoints.length >= 4 && renderShape(buildShape(canvas.tool, canvas.draftStart, canvas.draftPoints, canvas.color, canvas.strokeWidth), "draft", false)}
        </svg>
        <CaptureV2PhotoPins
          pins={attachmentPins}
          transform={canvas.transform}
          stageRef={canvas.stageRef}
          onPinsChange={(pins) => onAttachmentPinsChange?.(pins)}
          onAttachFile={(pin) => onAttachFileToPin?.(pin)}
          onAttachPhoto={(pin) => onAttachPhotoToPin?.(pin)}
          openPinId={openPinId}
        />
        {canvas.editingTextId ? (
          <TextEditor
            shape={canvas.shapes.find((shape) => shape.id === canvas.editingTextId)}
            onChange={(value) => canvas.updateText(canvas.editingTextId!, value)}
            onDone={() => canvas.setEditingTextId(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function renderSelectionBounds(shape: MarkupShape | null, onHandleDown: (event: PointerEvent<SVGElement>, shape: MarkupShape, handle: ResizeHandle) => void) {
  const bounds = shape ? getShapeBounds(shape) : null;
  if (!bounds) return null;
  const handles: Array<[ResizeHandle, number, number]> = [["nw", bounds.x, bounds.y], ["ne", bounds.x + bounds.width, bounds.y], ["sw", bounds.x, bounds.y + bounds.height], ["se", bounds.x + bounds.width, bounds.y + bounds.height]];
  return <g><rect pointerEvents="none" x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="none" stroke="var(--graphite-primary)" strokeDasharray="12 8" strokeWidth={3} />{shape && handles.map(([handle, x, y]) => <rect key={handle} x={x - 12} y={y - 12} width={24} height={24} rx={5} fill="var(--graphite-primary)" stroke="var(--graphite-canvas)" strokeWidth={3} className="cursor-nwse-resize" onPointerDown={(event) => onHandleDown(event, shape, handle)} />)}</g>;
}

function renderShape(shape: MarkupShape | null, keySuffix = "", selected = false, onPointerDown?: (event: PointerEvent<SVGElement>) => void) {
  if (!shape) return null;
  const key = `${shape.id}${keySuffix}`;
  const common = { onPointerDown, className: "cursor-move", filter: selected ? "drop-shadow(0 0 8px rgba(0,230,153,.9))" : undefined };
  if (shape.kind === "rect") return <rect key={key} {...common} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} />;
  if (shape.kind === "ellipse") return <ellipse key={key} {...common} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={shape.fill} stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} />;
  if (shape.kind === "arrow") return <ArrowShape key={key} shape={shape} selected={selected} onPointerDown={onPointerDown} />;
  if (shape.kind === "text") return <text key={key} {...common} x={shape.x} y={shape.y} fill={shape.stroke} fontSize={shape.fontSize} fontWeight={800}>{shape.text || "Tap to type"}</text>;
  if (shape.kind === "freehand") return <polyline key={key} {...common} points={shape.points.join(" ")} fill="none" stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  return null;
}

function ArrowShape({ shape, selected = false, onPointerDown }: { shape: Extract<MarkupShape, { kind: "arrow" }>; selected?: boolean; onPointerDown?: (event: PointerEvent<SVGElement>) => void }) {
  const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
  const left = `${shape.x2 - shape.headSize * Math.cos(angle - Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle - Math.PI / 6)}`;
  const right = `${shape.x2 - shape.headSize * Math.cos(angle + Math.PI / 6)},${shape.y2 - shape.headSize * Math.sin(angle + Math.PI / 6)}`;
  return <g onPointerDown={onPointerDown} className="cursor-move" filter={selected ? "drop-shadow(0 0 8px rgba(0,230,153,.9))" : undefined}><line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} strokeLinecap="round" /><polyline points={`${left} ${shape.x2},${shape.y2} ${right}`} fill="none" stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></g>;
}
