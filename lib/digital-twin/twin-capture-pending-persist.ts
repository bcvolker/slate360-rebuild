"use client";

import type { SlateDropPickerFile } from "@/lib/slatedrop/file-picker-types";
import type { TwinProcessingQuality } from "@/lib/twin/processing-estimate-types";
import type {
  TwinCaptureClipReview,
  TwinCapturePendingSession,
  TwinReviewAddedSource,
} from "./twin-capture-pending-session";

const META_KEY = "twin-capture-review-persist-v1";
const IDB_NAME = "slate360-twin-capture";
const IDB_STORE = "pending-files";

type StoredClip = Omit<TwinCaptureClipReview, "files" | "thumbnailUrl"> & {
  files: Array<{ key: string; name: string; type: string }>;
};

type StoredAddedSource =
  | {
      kind: "local";
      id: string;
      origin: "camera_roll" | "files";
      fileKey: string;
      name: string;
      type: string;
    }
  | {
      kind: "slatedrop";
      id: string;
      pickerFile: SlateDropPickerFile;
    };

type StoredReviewState = {
  session: Omit<TwinCapturePendingSession, "clips"> & { clips: StoredClip[] };
  scanName: string;
  quality: TwinProcessingQuality;
  addedSources: StoredAddedSource[];
};

export type RestoredTwinCaptureReviewState = {
  session: TwinCapturePendingSession;
  scanName: string;
  quality: TwinProcessingQuality;
  addedSources: TwinReviewAddedSource[];
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(IDB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
  db.close();
}

async function getBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
  });
  db.close();
  return blob;
}

async function clearBlobStore(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB clear failed"));
  });
  db.close();
}

function clipFileKey(clipId: string, index: number) {
  return `clip:${clipId}:${index}`;
}

function addedFileKey(sourceId: string) {
  return `added:${sourceId}`;
}

export async function persistTwinCaptureReviewForCheckout(args: {
  session: TwinCapturePendingSession;
  scanName: string;
  quality: TwinProcessingQuality;
  addedSources: TwinReviewAddedSource[];
}): Promise<void> {
  if (typeof window === "undefined") return;

  await clearBlobStore();

  const storedClips: StoredClip[] = [];
  for (const clip of args.session.clips) {
    const files: StoredClip["files"] = [];
    for (let index = 0; index < clip.files.length; index += 1) {
      const file = clip.files[index]!;
      const key = clipFileKey(clip.id, index);
      files.push({
        key,
        name: file.name,
        type: file.type || "application/octet-stream",
      });
      await putBlob(key, file);
    }
    storedClips.push({
      id: clip.id,
      index: clip.index,
      mode: clip.mode,
      durationSeconds: clip.durationSeconds,
      frameCount: clip.frameCount,
      files,
    });
  }

  const storedAdded: StoredAddedSource[] = [];
  for (const source of args.addedSources) {
    if (source.origin === "slatedrop") {
      storedAdded.push({ kind: "slatedrop", id: source.id, pickerFile: source.pickerFile });
      continue;
    }
    const key = addedFileKey(source.id);
    await putBlob(key, source.file);
    storedAdded.push({
      kind: "local",
      id: source.id,
      origin: source.origin,
      fileKey: key,
      name: source.file.name,
      type: source.file.type || "application/octet-stream",
    });
  }

  const payload: StoredReviewState = {
    session: {
      selection: args.session.selection,
      projectName: args.session.projectName,
      quickMode: args.session.quickMode,
      clips: storedClips,
    },
    scanName: args.scanName,
    quality: args.quality,
    addedSources: storedAdded,
  };

  sessionStorage.setItem(META_KEY, JSON.stringify(payload));
}

export async function restoreTwinCaptureReviewState(): Promise<RestoredTwinCaptureReviewState | null> {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(META_KEY);
  if (!raw) return null;

  let stored: StoredReviewState;
  try {
    stored = JSON.parse(raw) as StoredReviewState;
  } catch {
    return null;
  }

  const clips: TwinCaptureClipReview[] = [];
  for (const clip of stored.session.clips) {
    const files: File[] = [];
    for (const meta of clip.files) {
      const blob = await getBlob(meta.key);
      if (!blob) return null;
      files.push(new File([blob], meta.name, { type: meta.type }));
    }
    const thumbnailUrl =
      files[0] && files[0].type.startsWith("image/") ? URL.createObjectURL(files[0]) : null;
    clips.push({
      id: clip.id,
      index: clip.index,
      mode: clip.mode,
      durationSeconds: clip.durationSeconds,
      frameCount: clip.frameCount,
      files,
      thumbnailUrl,
    });
  }

  const addedSources: TwinReviewAddedSource[] = [];
  for (const source of stored.addedSources) {
    if (source.kind === "slatedrop") {
      addedSources.push({
        id: source.id,
        origin: "slatedrop",
        pickerFile: source.pickerFile,
      });
      continue;
    }
    const blob = await getBlob(source.fileKey);
    if (!blob) return null;
    addedSources.push({
      id: source.id,
      origin: source.origin,
      file: new File([blob], source.name, { type: source.type }),
    });
  }

  return {
    session: {
      selection: stored.session.selection,
      projectName: stored.session.projectName,
      quickMode: stored.session.quickMode,
      clips,
    },
    scanName: stored.scanName,
    quality: stored.quality,
    addedSources,
  };
}

export function clearTwinCaptureReviewPersistedState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(META_KEY);
  void clearBlobStore();
}
