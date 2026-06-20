# Spec: Offline Capture Queue (Prompt B)

Status: **spec / planning** (no app code). Extends existing `lib/offline-queue.ts` +
`lib/site-walk/offline-capture.ts`. Consensus across all external passes. Aligns with
`docs/APP_STORE_AND_OFFLINE_STRATEGY.md` (offline is app-layer, NOT service-worker cache).

## 1. Architecture (extend, don't replace)
```
Capture → Capacitor Filesystem (full-res originals)  +  Dexie/IDB (metadata + queue)
       → instant "Saved locally" UI
       → Upload Orchestrator (foreground worker; runs on app-open + online + visibility)
            → presigned multipart PUT → R2/S3 (resumable, checksummed parts)
            → POST /api/.../complete  (server confirms etag)
       → mark synced → delete local blob after verify
```

## 2. Stack
| Concern | Choice |
|---|---|
| Blob storage | `@capacitor/filesystem` (survives IDB eviction); IDB for thumbs/pointers |
| Metadata + queue | **Dexie** (upgrade from idb-keyval — indexed tables: mutations, uploads, blobs) |
| Resumable upload | `@aws-sdk/lib-storage` multipart via presigned parts (uploadId, byte range, retry count) |
| Connectivity | `@capacitor/network` + `navigator.onLine` |
| Background | Capacitor Background Runner (iOS 17+) / Android WorkManager — **best-effort only** |
| Background Sync API | progressive enhancement (Android PWA) — **never the contract** |

## 3. iOS / installed-PWA reality (2025–2026)
- **Background Sync is unreliable on iOS** → foreground-first; resume uploads on app-open,
  `online` event, and `visibilitychange`.
- IDB quota ~50MB–1GB and **evictable** → blobs go to Filesystem, not IDB.
- BG upload while app is backgrounded → only via native (Capacitor) task; web cannot.
- **Most reliable cross-platform:** Capacitor native shell + foreground orchestrator +
  native background-upload task on iOS. Show a persistent sync badge.

## 4. Queue record + conflict
```ts
{ client_item_id, client_mutation_id, revision_id, sessionId, blobPath, mutation,
  uploadState:'queued'|'uploading'|'parts_done'|'synced'|'failed'|'conflict',
  uploadId?, completedParts?, bytesUploaded, attemptCount, createdAt, lastAttemptAt }
```
Server upsert is **idempotent on `(session_id, client_item_id)`**; server wins on `updated_at`;
photos are append-only so duplicate IDs dedupe. Surface a conflict badge only on metadata divergence.

## 5. Progress UI
Header chip: `↑ 3 pending · 24 MB`; per-item sync icon (local ✓ / uploading % / synced / failed /
conflict); Settings → "Retry all" + "Upload on Wi-Fi only" + "Export unsynced" safety valve.
Never block capture on upload.

## 6. Build order
1. Dexie schema + Filesystem blob store (migrate from idb-keyval).
2. Foreground upload orchestrator + multipart resume + checkpointing.
3. Sync badge + per-item states + retry.
4. Capacitor native background-upload task (iOS) / WorkManager (Android).
5. Conflict surfacing + "upload on Wi-Fi only".
