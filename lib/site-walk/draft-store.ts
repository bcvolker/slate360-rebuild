/**
 * lib/site-walk/draft-store.ts
 *
 * IndexedDB-backed persistence for in-flight Site Walk capture drafts.
 * Extracted from SiteWalkSessionProvider so the provider stays under
 * the 300-line limit. Uses idb-keyval (structured-clone) which natively
 * stores Blobs.
 */
import { get as idbGet, set as idbSet, del as idbDel, createStore } from "idb-keyval";

export type DraftTab = "camera" | "note" | "voice" | null;

export interface DraftItem {
  tab: DraftTab;
  title: string;
  noteText: string;
  /** Generated fresh on rehydrate via URL.createObjectURL. Never persists. */
  photoBlobUrl: string | null;
  audioBlobUrl: string | null;
  /** The actual Blob bytes — what survives a reload. */
  photoBlob: Blob | null;
  audioBlob: Blob | null;
  updatedAt: number;
}

export interface PersistedDraft {
  tab: DraftTab;
  title: string;
  noteText: string;
  photoBlob: Blob | null;
  audioBlob: Blob | null;
  updatedAt: number;
}

export const EMPTY_DRAFT: DraftItem = {
  tab: null,
  title: "",
  noteText: "",
  photoBlobUrl: null,
  audioBlobUrl: null,
  photoBlob: null,
  audioBlob: null,
  updatedAt: 0,
};

const draftStore =
  typeof window !== "undefined"
    ? createStore("slate360-site-walk", "session-drafts")
    : null;

function draftKey(sessionId: string): string {
  return `draft:${sessionId}`;
}

export async function loadDraftFromIdb(sessionId: string): Promise<DraftItem> {
  if (!draftStore) return EMPTY_DRAFT;
  try {
    const raw = await idbGet<PersistedDraft>(draftKey(sessionId), draftStore);
    if (!raw) return EMPTY_DRAFT;
    const photoBlob = raw.photoBlob instanceof Blob ? raw.photoBlob : null;
    const audioBlob = raw.audioBlob instanceof Blob ? raw.audioBlob : null;
    return {
      tab: raw.tab ?? null,
      title: typeof raw.title === "string" ? raw.title : "",
      noteText: typeof raw.noteText === "string" ? raw.noteText : "",
      photoBlob,
      audioBlob,
      photoBlobUrl: photoBlob ? URL.createObjectURL(photoBlob) : null,
      audioBlobUrl: audioBlob ? URL.createObjectURL(audioBlob) : null,
      updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

export async function persistDraftToIdb(sessionId: string, draft: DraftItem): Promise<void> {
  if (!draftStore) return;
  try {
    const payload: PersistedDraft = {
      tab: draft.tab,
      title: draft.title,
      noteText: draft.noteText,
      photoBlob: draft.photoBlob,
      audioBlob: draft.audioBlob,
      updatedAt: draft.updatedAt,
    };
    await idbSet(draftKey(sessionId), payload, draftStore);
  } catch {
    // Quota / private mode — silent.
  }
}

export async function clearDraftFromIdb(sessionId: string): Promise<void> {
  if (!draftStore) return;
  try {
    await idbDel(draftKey(sessionId), draftStore);
  } catch {
    // ignore
  }
}
