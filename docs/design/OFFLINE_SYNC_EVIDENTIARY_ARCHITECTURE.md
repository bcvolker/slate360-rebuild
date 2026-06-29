# Offline-First Sync + Evidentiary Integrity — LOCKED plan (multi-AI consensus, Jun 28 2026)

> 8+ independent expert passes; unanimous. Additive only — extends existing
> `lib/site-walk/offline-db.ts`, `sync-manager.ts`, `client_item_id`/`client_mutation_id`
> idempotency, twin multipart upload. Backend (Supabase/S3) is fixed.

## The thesis (decides everything)
This is a **Capacitor app, not a browser** — so the local store of record must be **native
SQLite + native filesystem**, NOT IndexedDB/OPFS. WebKit proactively evicts script-writable
storage (IndexedDB/OPFS/Cache) after 7 days, and a WKWebView origin is capped ~15% of disk.
For an app where a super's only copy of legal evidence sits on-device for hours, eviction is
disqualifying. Native stores in the app sandbox are immune.

## 1. Offline-first capture & sync
- **Store of record:** structured metadata + queues → **native SQLite** (`@capacitor-community/
  sqlite`, or Capawesome's OPFS-WASM build; the community plugin is ~10× slower on large sets).
  Binary media → **`@capacitor/filesystem`** (Directory.Data), paths only. Migrate blobs OUT of
  IndexedDB. Thumbnails ≤200KB in Dexie or in-memory LRU.
- **RAM flat:** media never enters the JS heap — stream camera→file, **stream-hash** off disk,
  **stream-upload** 6MB/8MB chunks off disk. Never base64 a whole video.
- **Two decoupled queues:** mutation queue (metadata, idempotent by `client_mutation_id`, ordered
  by HLC + `depends_on` DAG, tombstones for deletes) and a SEPARATE media-upload queue. A stuck
  200MB video must NOT block note sync.
- **Media-first two-phase commit** (kills half-synced states): upload+hash-verify the media FIRST,
  then push the metadata mutation that references the verified object.
- **Pull-before-push** on reconnect (catch the other super's edits before overwriting). Exponential
  backoff+jitter; cap retries → "failed inbox" (never silently drop evidence mutations).
- **iOS gotchas:** native stores (not OPFS) dodge eviction; `navigator.storage.persist()` is
  belt-and-suspenders only; background uploads need a native `URLSession` background-transfer
  plugin (JS suspends when backgrounded) — foreground-resumable is the contract; `navigator.onLine`
  lies (HEAD a health endpoint).

## 2. Multi-user conflict resolution
**Append-only for media, field-level LWW + Hybrid Logical Clocks for scalar metadata, CRDT (Yjs)
ONLY for co-edited note bodies.** Don't CRDT everything. Conflict matrix: append media to same pin
= both win (no conflict); edit scalar metadata = LWW by HLC; move/rename pin = LWW + flag if it has
evidence; note body = Yjs or keep-both; delete = tombstone wins but surface restore. **Never silent
overwrite** — conflict card (keep mine / theirs / both; "both" is the evidentiary-safe default).
Every resolution is itself an audit event. Add `hlc` + `author_node_id` (+ `conflict_flag`) to
mutable entities; `entity_tombstones` + `pin_events` (append-only) tables.

## 3. Large-media upload reliability
**TUS** (Supabase resumable) or extend the existing **twin multipart presigned** flow. Chunk size
**6MB (Supabase TUS mandatory)** / 8MB (multipart). retryDelays `[0,3,5,10,20,30s]`+jitter; resume
by offset (checkpoint each completed part). Upload URL ~24h → recreate on expiry. Concurrency: Wi-Fi
2–3, cellular 1. Per-file status UI; one file's failure never blocks the batch.

## 4. Evidentiary integrity / chain of custody
What holds up: **FRE 901** (authenticate) + **FRE 902(14)** (hash-based self-authentication — a
matching SHA-256 turns hours of foundation testimony into a one-page certificate). EXIF alone is
weak (trivially edited). Pipeline:
1. **SHA-256 at capture, on-device, before upload** ✅ **DONE** — `lib/site-walk/content-hash.ts`
   `sha256Hex()`, bound into `CaptureMetadata.content_sha256` in `createCaptureItem` (flows into
   `site_walk_items.metadata`). **TODO:** server re-hash on upload-complete + compare → `hash_verified`.
2. **RFC 3161 qualified timestamp** on the hash (Open TSA free / commercial QTSP for Certified tier).
3. **Append-only, hash-chained audit log** (`evidence_events`: captured/uploaded/hash_verified/
   included_in_deliverable/shared/viewed/ai_formatted; `prev_hash`+`event_hash`; no UPDATE/DELETE).
4. **Geo/heading/device binding** (already captured via `device-orientation.ts` + GPS) into the manifest.
5. **AI notes:** preserve `raw_transcript` verbatim+immutable; `ai_formatted` separate with provenance
   (model/prompt/approved_by); AI may format only, never add facts; disclose in deliverable;
   human approval before inclusion. (= SW-014)
6. **Certified Evidence export** ZIP: originals + per-file sha256 + RFC3161 tokens + hash-chained
   audit_trail + raw/AI notes + certification.pdf + VERIFY instructions.

## 5. Field reliability UX
Tap targets 56–72px (gloves); contrast 7:1 critical (sunlight) — Graphite Glass dark needs a
**high-contrast light outdoor capture variant**; **haptic** confirmation (audio is masked at 90dB);
voice memo = record raw first, transcribe later, live waveform; **persistent sync chip** ("N
pending · M MB", calm "waiting for network", never blocks capture).

## Build order (consensus)
1. ✅ **SHA-256 at capture** (`content-hash.ts` + metadata). 2. Native SQLite outbox + Filesystem
blob store (migrate off IndexedDB blobs). 3. Multipart/TUS resume + per-part checkpoint + decoupled
media queue. 4. Server idempotency + pull-before-push + server hash re-verify. 5. `evidence_events`
append-only log. 6. HLC + conflict UX. 7. AI dual-storage (SW-014). 8. Field sync chip + status.
9. Native background upload. 10. Certified Evidence export. (P0 = 1–5; P1 = 6–8; P2 = 9–10.)

See [[slate360-offline-evidentiary-plan]], docs/TWIN360_CAPTURE_GAPS.md (SW-011/SW-014/WORKFLOW-001/
CONFLICT-001), docs/specs/OFFLINE_CAPTURE.md, docs/APP_STORE_AND_OFFLINE_STRATEGY.md.
