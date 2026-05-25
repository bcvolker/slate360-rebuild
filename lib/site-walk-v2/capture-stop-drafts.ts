import type { CaptureClassification } from "@/components/site-walk-v2/capture-flow-types";

export const CAPTURE_V2_STOP_DRAFTS_KEY = "capture_v2_stop_drafts";

export type CaptureStopPinPct = { x: number; y: number };

export type CaptureStopDraftPayload = {
  notes: string;
  classification: CaptureClassification | null;
  photoS3Key: string | null;
  photoFileId: string | null;
  pinPct: CaptureStopPinPct | null;
  markupCount: number;
};

export type CaptureStopDraftRecord = CaptureStopDraftPayload & {
  stopId: string;
  complete: boolean;
  savedAt: string;
};

export type CaptureV2StopDraftStore = {
  version: 1;
  currentStopIndex: number;
  stops: Record<string, CaptureStopDraftRecord>;
  updatedAt: string;
};

export const EMPTY_STOP_DRAFT: CaptureStopDraftPayload = {
  notes: "",
  classification: null,
  photoS3Key: null,
  photoFileId: null,
  pinPct: null,
  markupCount: 0,
};

type SessionResponse = {
  session?: { metadata?: Record<string, unknown> };
  error?: string;
};

function emptyStore(currentStopIndex = 0): CaptureV2StopDraftStore {
  return { version: 1, currentStopIndex, stops: {}, updatedAt: new Date().toISOString() };
}

function normalizePhotoS3Key(value: unknown): string | null {
  if (typeof value === "string" && !value.startsWith("data:")) return value;
  return null;
}

function normalizeDraftRecord(raw: Partial<CaptureStopDraftRecord>): CaptureStopDraftRecord {
  const legacyPhotoUrlRaw = (raw as { photoUrl?: unknown }).photoUrl;
  return {
    stopId: raw.stopId ?? "",
    notes: raw.notes ?? "",
    classification: raw.classification ?? null,
    photoS3Key: normalizePhotoS3Key(raw.photoS3Key) ?? normalizePhotoS3Key(legacyPhotoUrlRaw),
    photoFileId: raw.photoFileId ?? null,
    pinPct: raw.pinPct ?? null,
    markupCount: raw.markupCount ?? 0,
    complete: raw.complete ?? false,
    savedAt: raw.savedAt ?? "",
  };
}

export function parseCaptureV2StopDraftStore(raw: unknown): CaptureV2StopDraftStore | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<CaptureV2StopDraftStore>;
  if (value.version !== 1 || typeof value.stops !== "object" || value.stops === null) return null;
  const stops: Record<string, CaptureStopDraftRecord> = {};
  for (const [stopId, record] of Object.entries(value.stops)) {
    stops[stopId] = normalizeDraftRecord({ ...record, stopId: record.stopId ?? stopId });
  }
  return {
    version: 1,
    currentStopIndex: typeof value.currentStopIndex === "number" ? value.currentStopIndex : 0,
    stops,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

export function draftPayloadsEqual(a: CaptureStopDraftPayload, b: CaptureStopDraftPayload): boolean {
  return (
    a.notes === b.notes &&
    a.classification === b.classification &&
    a.photoS3Key === b.photoS3Key &&
    a.photoFileId === b.photoFileId &&
    a.markupCount === b.markupCount &&
    JSON.stringify(a.pinPct) === JSON.stringify(b.pinPct)
  );
}

export async function loadCaptureV2StopDraftStore(sessionId: string): Promise<{
  store: CaptureV2StopDraftStore;
  metadata: Record<string, unknown>;
}> {
  const response = await fetch(`/api/site-walk/sessions/${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
  });
  const data = (await response.json()) as SessionResponse;
  const metadata =
    data.session?.metadata && typeof data.session.metadata === "object"
      ? data.session.metadata
      : {};
  const store = parseCaptureV2StopDraftStore(metadata[CAPTURE_V2_STOP_DRAFTS_KEY]) ?? emptyStore();
  return { store, metadata };
}

export async function persistCaptureV2StopDraftStore(
  sessionId: string,
  store: CaptureV2StopDraftStore,
  metadata: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`/api/site-walk/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      metadata: { ...metadata, [CAPTURE_V2_STOP_DRAFTS_KEY]: { ...store, updatedAt: new Date().toISOString() } },
      sync_state: "synced",
      last_synced_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not save stop draft");
  }
}

export async function clearCaptureV2StopDraftStore(
  sessionId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const nextMetadata = { ...metadata };
  delete nextMetadata[CAPTURE_V2_STOP_DRAFTS_KEY];
  const response = await fetch(`/api/site-walk/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      metadata: nextMetadata,
      sync_state: "synced",
      last_synced_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not clear stop drafts");
  }
}
