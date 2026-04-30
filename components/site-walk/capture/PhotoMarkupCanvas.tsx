"use client";

import type { PointerEvent } from "react";
import type { MarkupData, MarkupShape } from "@/lib/site-walk/markup-types";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { buildShape, getShapeBounds, MARKUP_HEIGHT, MARKUP_WIDTH } from "./markupCanvasGeometry";
import type { ResizeHandle } from "./markupShapeEdits";
import { TextEditor } from "./PhotoMarkupControls";
import { PhotoAttachmentPins } from "./PhotoAttachmentPins";
import { PHOTO_MARKUP_REDO_EVENT, PHOTO_MARKUP_UNDO_EVENT, useMarkupCanvasState } from "./useMarkupCanvasState";

export { PHOTO_MARKUP_REDO_EVENT, PHOTO_MARKUP_UNDO_EVENT };

type Props = {
  imageUrl: string;
  title: string;
  sessionId: string;
  markupEnabled: boolean;
  initialMarkup?: MarkupData | null;
  attachmentPins?: PhotoAttachmentPin[];
  onMarkupChange?: (markup: MarkupData) => void;
  onAttachmentPinsChange?: (pins: PhotoAttachmentPin[]) => void;
};

export function PhotoMarkupCanvas({ imageUrl, title, sessionId, markupEnabled, initialMarkup, attachmentPins = [], onMarkupChange, onAttachmentPinsChange }: Props) {
  const canvas = useMarkupCanvasState({ imageUrl, markupEnabled, initialMarkup, onMarkupChange });
  const editingTextId = canvas.editingTextId;

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
          alt={title}
          onLoad={(event) => canvas.setPortrait(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth)}
          className="h-full w-full select-none object-cover"
          style={{ transform: `translate(${canvas.transform.x}px, ${canvas.transform.y}px) scale(${canvas.transform.scale})`, transformOrigin: "center" }}
          draggable={false}
        />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${MARKUP_WIDTH} ${MARKUP_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ transform: `translate(${canvas.transform.x}px, ${canvas.transform.y}px) scale(${canvas.transform.scale})`, transformOrigin: "center" }}
        >
          {canvas.shapes.map((shape) => renderShape(shape, "", canvas.selectedId === shape.id, (event) => canvas.beginShapeDrag(event, shape)))}
          {renderSelectionBounds(canvas.shapes.find((shape) => shape.id === canvas.selectedId) ?? null, canvas.beginSelectionResize)}
          {canvas.draftStart && canvas.draftPoints.length >= 4 && renderShape(buildShape(canvas.tool, canvas.draftStart, canvas.draftPoints, canvas.color, canvas.strokeWidth), "draft", false)}
        </svg>
        <PhotoAttachmentPins sessionId={sessionId} pins={attachmentPins} draftPin={canvas.draftPin} transform={canvas.transform} onDraftClose={() => canvas.setDraftPin(null)} onPinsChange={(pins) => onAttachmentPinsChange?.(pins)} />
        {editingTextId && <TextEditor shape={canvas.shapes.find((shape) => shape.id === editingTextId)} onChange={(value) => canvas.updateText(editingTextId, value)} onDone={() => canvas.setEditingTextId(null)} />}
      </div>
    </div>
  );
}

function renderSelectionBounds(shape: MarkupShape | null, onHandleDown: (event: PointerEvent<SVGElement>, shape: MarkupShape, handle: ResizeHandle) => void) {
  const bounds = shape ? getShapeBounds(shape) : null;
  if (!bounds) return null;
  const handles: Array<[ResizeHandle, number, number]> = [["nw", bounds.x, bounds.y], ["ne", bounds.x + bounds.width, bounds.y], ["sw", bounds.x, bounds.y + bounds.height], ["se", bounds.x + bounds.width, bounds.y + bounds.height]];
  return <g><rect pointerEvents="none" x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="none" stroke="#67e8f9" strokeDasharray="12 8" strokeWidth={3} />{shape && handles.map(([handle, x, y]) => <rect key={handle} x={x - 12} y={y - 12} width={24} height={24} rx={5} fill="#67e8f9" stroke="#0f172a" strokeWidth={3} className="cursor-nwse-resize" onPointerDown={(event) => onHandleDown(event, shape, handle)} />)}</g>;
}

function renderShape(shape: MarkupShape | null, keySuffix = "", selected = false, onPointerDown?: (event: PointerEvent<SVGElement>) => void) {
  if (!shape) return null;
  const key = `${shape.id}${keySuffix}`;
  const common = { onPointerDown, className: "cursor-move", filter: selected ? "drop-shadow(0 0 8px rgba(59,130,246,.9))" : undefined };
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
  return <g onPointerDown={onPointerDown} className="cursor-move" filter={selected ? "drop-shadow(0 0 8px rgba(59,130,246,.9))" : undefined}><line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} strokeLinecap="round" /><polyline points={`${left} ${shape.x2},${shape.y2} ${right}`} fill="none" stroke={shape.stroke} strokeWidth={selected ? shape.strokeWidth + 3 : shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" /></g>;
}
