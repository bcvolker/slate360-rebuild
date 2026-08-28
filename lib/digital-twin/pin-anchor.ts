import { isFiniteVec3, type Vec3 } from "./s360-world";

export type PinScope = "project" | "epoch";

export type PinCategory =
  | "note"
  | "drawing"
  | "rfi"
  | "submittal"
  | "proposal"
  | "invoice"
  | "thermal"
  | "photo"
  | "inspection"
  | "report"
  | "equipment"
  | "punch"
  | "link";

export type PinAttachmentKind =
  | "document"
  | "image"
  | "panorama_360"
  | "thermal"
  | "link"
  | "proposal"
  | "invoice";

export type TwinPinAnchor = {
  position: Vec3;
  normal: Vec3 | null;
  sourceMeshId: string | null;
  epochId: string | null;
  faceIndex: number | null;
};

export type TwinPinRecord = {
  id: string;
  title: string;
  description: string;
  category: PinCategory;
  scope: PinScope;
  anchor: TwinPinAnchor;
  spaceId: string | null;
  modelId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export type PinMetadataV1 = {
  v: 1;
  category: PinCategory;
  scope: PinScope;
  normal: Vec3 | null;
  source_mesh_id: string | null;
  epoch_id: string | null;
  face_index: number | null;
};

const CATEGORIES: PinCategory[] = [
  "note",
  "drawing",
  "rfi",
  "submittal",
  "proposal",
  "invoice",
  "thermal",
  "photo",
  "inspection",
  "report",
  "equipment",
  "punch",
  "link",
];

export function isPinCategory(value: unknown): value is PinCategory {
  return typeof value === "string" && (CATEGORIES as string[]).includes(value);
}

export function serializePinMetadata(pin: TwinPinRecord): PinMetadataV1 {
  return {
    v: 1,
    category: pin.category,
    scope: pin.scope,
    normal: pin.anchor.normal,
    source_mesh_id: pin.anchor.sourceMeshId,
    epoch_id: pin.anchor.epochId,
    face_index: pin.anchor.faceIndex,
  };
}

export function deserializePin(row: {
  id: string;
  title: string;
  body?: string | null;
  position: unknown;
  normal?: unknown;
  metadata?: unknown;
  space_id?: string | null;
  model_id?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
}): TwinPinRecord | null {
  if (!isFiniteVec3(row.position)) return null;
  const meta =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : {};
  const now = new Date().toISOString();
  return {
    id: row.id,
    title: row.title,
    description: typeof row.body === "string" ? row.body : "",
    category: isPinCategory(meta.category) ? meta.category : "note",
    scope: meta.scope === "epoch" ? "epoch" : "project",
    anchor: {
      position: row.position,
      normal: isFiniteVec3(row.normal)
        ? row.normal
        : isFiniteVec3(meta.normal)
          ? meta.normal
          : null,
      sourceMeshId: typeof meta.source_mesh_id === "string" ? meta.source_mesh_id : null,
      epochId: typeof meta.epoch_id === "string" ? meta.epoch_id : row.model_id ?? null,
      faceIndex: typeof meta.face_index === "number" ? meta.face_index : null,
    },
    spaceId: row.space_id ?? null,
    modelId: row.model_id ?? null,
    createdAt: row.created_at ?? now,
    updatedAt: row.updated_at ?? row.created_at ?? now,
    createdBy: row.created_by ?? null,
  };
}

/**
 * Share links never see private files unless the share token already grants
 * annotate/download AND the attachment is an explicit external URL or a file
 * already published through the share pipeline. Invoices/proposals stay off
 * view-only tokens.
 */
export function canExposePinAttachmentOnShare(args: {
  shareRole: "view" | "annotate" | "download" | null;
  kind: PinAttachmentKind;
  hasStorageKey: boolean;
  hasUnifiedFileId: boolean;
  hasExternalUrl: boolean;
}): boolean {
  if (!args.shareRole) return false;
  if (args.kind === "invoice" || args.kind === "proposal") {
    return args.shareRole === "download";
  }
  if (args.shareRole === "view") {
    return args.hasExternalUrl && !args.hasStorageKey && !args.hasUnifiedFileId;
  }
  return args.hasExternalUrl || args.hasStorageKey || args.hasUnifiedFileId;
}

export function newPinId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const STORAGE_PREFIX = "s360.hybrid-twin.pins.";

export function loadLocalPins(spaceKey: string): TwinPinRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + spaceKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => deserializePin(row as Parameters<typeof deserializePin>[0]))
      .filter((p): p is TwinPinRecord => p !== null);
  } catch {
    return [];
  }
}

export function saveLocalPins(spaceKey: string, pins: TwinPinRecord[]): void {
  if (typeof window === "undefined") return;
  const payload = pins.map((pin) => ({
    id: pin.id,
    title: pin.title,
    body: pin.description,
    position: pin.anchor.position,
    normal: pin.anchor.normal,
    metadata: serializePinMetadata(pin),
    space_id: pin.spaceId,
    model_id: pin.modelId,
    created_at: pin.createdAt,
    updated_at: pin.updatedAt,
    created_by: pin.createdBy,
  }));
  window.localStorage.setItem(STORAGE_PREFIX + spaceKey, JSON.stringify(payload));
}
