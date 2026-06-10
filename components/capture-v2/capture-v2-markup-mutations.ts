import type { MutableRefObject } from "react";
import type { MarkupData, MarkupShape } from "@/lib/site-walk/markup-types";
import { recolorShape, setShapeStrokeWidth } from "@/components/site-walk/capture/markupShapeEdits";

type Refs = {
  shapesRef: MutableRefObject<MarkupShape[]>;
  undoRef: MutableRefObject<MarkupShape[][]>;
  redoRef: MutableRefObject<MarkupShape[][]>;
  selectedIdRef: MutableRefObject<string | null>;
};

type Setters = {
  setShapes: (shapes: MarkupShape[]) => void;
  setSelectedId: (id: string | null) => void;
  setEditingTextId: (id: string | null) => void;
};

export function createMarkupMutations(refs: Refs, setters: Setters, onMarkupChange?: (markup: MarkupData) => void) {
  function emitMarkup(nextShapes = refs.shapesRef.current) {
    onMarkupChange?.({ version: 1, coordSpace: "image", shapes: nextShapes });
  }

  function applyShapes(updater: (current: MarkupShape[]) => MarkupShape[], emit = true) {
    const nextShapes = updater(refs.shapesRef.current);
    refs.shapesRef.current = nextShapes;
    setters.setShapes(nextShapes);
    if (emit) emitMarkup(nextShapes);
  }

  function remember(snapshot = refs.shapesRef.current) {
    refs.undoRef.current = [...refs.undoRef.current.slice(-14), snapshot];
    refs.redoRef.current = [];
  }

  function deleteSelected() {
    const targetId = refs.selectedIdRef.current;
    if (!targetId) return;
    remember();
    applyShapes((current) => current.filter((shape) => shape.id !== targetId));
    setters.setSelectedId(null);
    setters.setEditingTextId(null);
  }

  function editSelectedShape(update: (shape: MarkupShape) => MarkupShape) {
    const targetId = refs.selectedIdRef.current;
    if (!targetId) return;
    remember();
    applyShapes((current) => current.map((shape) => (shape.id === targetId ? update(shape) : shape)));
  }

  function updateText(id: string, text: string) {
    applyShapes((current) =>
      current.map((shape) => (shape.id === id && shape.kind === "text" ? { ...shape, text, updatedAt: Date.now() } : shape)),
    );
  }

  function applyToolDetail(detail: Record<string, unknown> | null, setColor: (color: string) => void, setStrokeWidth: (width: number) => void) {
    if (typeof detail?.color === "string") {
      setColor(detail.color);
      editSelectedShape((shape) => recolorShape(shape, detail.color as string));
    }
    if (typeof detail?.strokeWidth === "number") {
      setStrokeWidth(detail.strokeWidth);
      editSelectedShape((shape) => setShapeStrokeWidth(shape, detail.strokeWidth as number));
    }
    if (detail?.deleteSelected) deleteSelected();
  }

  return { applyShapes, emitMarkup, remember, deleteSelected, editSelectedShape, updateText, applyToolDetail };
}
