/** Drag-and-drop MIME + payload for Library → timeline / inspector targets. */
export const LIBRARY_DND = "application/x-cs-library-item";

export type LibraryDragPayload = {
  id: string;
  assetType: string;
  name: string;
  dropTarget: string;
  metadata: Record<string, unknown>;
  lookJson?: Record<string, unknown>;
};

export function encodeLibraryDrag(item: LibraryDragPayload): string {
  return JSON.stringify(item);
}

export function decodeLibraryDrag(raw: string): LibraryDragPayload | null {
  try {
    return JSON.parse(raw) as LibraryDragPayload;
  } catch {
    return null;
  }
}
