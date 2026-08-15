import Foundation

/// Native direct-to-storage uploader for Twin captures.
///
/// Mirrors the web multipart pipeline (`hooks/twin-upload-runners.ts`) but runs
/// entirely in native code so large capture files NEVER pass through the WKWebView
/// JS heap (pulling a multi-hundred-MB MP4 into a JS `Blob` destabilised the
/// WebContent process — the post-capture "Load failed" crash).
///
/// Rebuilt 2026-07-01 per the locked upload consensus (TWIN_CAPTURE_UPLOAD_FIX.md):
/// files ride a **background URLSession** (`TwinUploadSession`) as file-based
/// parallel part PUTs with on-disk resume state, so screen-lock/backgrounding no
/// longer kills the upload and a relaunch resumes only the missing parts.
///
/// 2026-08-15: EVERY file now goes through /upload/init + the background engine —
/// small files (photos, gz sidecars) are single-part multipart uploads. The old
/// inline /upload/single path uploaded photos serially with 3 quick retries and
/// aborted the whole queue on the first failure: the 2026-08-14 walk died at photo 3,
/// which also prevented the ply/poses sidecars (queued after photos) from ever
/// registering. Failures are now per-asset: one dead file no longer blocks the rest,
/// the server records error_text, and the engine's on-disk manifest retries it on the
/// next app launch. A single `captureId` threads through every call so all assets
/// attach to one capture.
final class TwinUploader {

    struct FileEntry {
        let url: URL
        let filename: String
        let contentType: String
        let assetKind: String?
    }

    enum UploadError: LocalizedError {
        case http(Int, String)
        case missing(String)

        var errorDescription: String? {
            switch self {
            case let .http(code, msg):
                return msg.isEmpty ? "Upload failed (HTTP \(code))" : "Upload failed (HTTP \(code)): \(msg)"
            case let .missing(what):
                return "Upload failed — missing \(what)"
            }
        }

        var statusCode: Int? {
            if case let .http(code, _) = self { return code }
            return nil
        }
    }

    // Requested part size — bigger parts (16 MiB, consensus range 16-25) mean fewer
    // round trips and better cellular throughput. The server clamps and its response
    // (`partSizeBytes`) is authoritative. Files smaller than a part upload as a
    // single-part multipart (the last part is exempt from the S3 minimum).
    private let requestedPartBytes = 16 * 1024 * 1024
    // Files per /upload/init POST — the server upserts each file's asset row inside
    // the request, so a 100-photo walk is split across a few quick calls instead of
    // one long one.
    private let initBatchSize = 25

    private let apiBase: String
    private let cookieHeader: String
    private var spaceId: String
    private var projectId: String
    private let title: String?

    /// Emits a short human-readable label for the step currently in flight (e.g.
    /// "Uploading video…", "Finishing up…"). Drives the live web spinner copy.
    var onStep: ((String) -> Void)?

    /// Emits overall upload progress in [0, 1], byte-weighted across all files.
    var onProgress: ((Double) -> Void)?

    private var uploadedBytes: Int64 = 0
    private var totalBytes: Int64 = 1
    private let progressLock = NSLock()

    init(apiBase: String, cookieHeader: String, spaceId: String, projectId: String, title: String?) {
        // Trim any trailing slash so apiBase + "/api/..." is well-formed.
        self.apiBase = apiBase.hasSuffix("/") ? String(apiBase.dropLast()) : apiBase
        self.cookieHeader = cookieHeader
        self.spaceId = spaceId
        self.projectId = projectId
        self.title = title
    }

    /// Friendly label for a capture file, used in progress updates.
    private func stepLabel(for entry: FileEntry) -> String {
        switch entry.assetKind {
        case "video": return "Uploading video…"
        case "ply_lidar": return "Uploading LiDAR mesh…"
        case "lidar_poses": return "Uploading scan data…"
        default: return "Uploading \(entry.filename)…"
        }
    }

    /// Result of an upload session. `failedFiles` lists files that exhausted their
    /// engine retries THIS session — their asset rows are marked failed server-side
    /// (with error_text) and their engine manifests stay on disk, so the next app
    /// launch retries them automatically. `unregisteredFiles` never made it past
    /// /upload/init (even after retries): no asset row, no manifest, no auto-retry —
    /// the caller must not promise the user they'll recover on their own.
    struct Outcome {
        let captureId: String
        let failedFiles: [String]
        let unregisteredFiles: [String]
    }

    /// Uploads every file via the background engine and returns the capture id plus
    /// any per-file failures. Blocking — call on a background queue. Throws only when
    /// NOTHING could be uploaded (no captureId, or every file failed); a partial
    /// failure returns normally so one dead photo can't strand the whole walk.
    func upload(files: [FileEntry]) throws -> Outcome {
        // Self-heal: if the web layer didn't pass a workspace (e.g. a stale cached web
        // bundle), create a quick-scan space natively so the capture isn't lost.
        if spaceId.isEmpty {
            onStep?("Preparing workspace…")
            let (sid, pid) = try createQuickScanSpace(title: title ?? "Quick scan")
            spaceId = sid
            projectId = pid
        }

        totalBytes = max(1, files.reduce(Int64(0)) { $0 + Int64(fileSize($1.url)) })
        uploadedBytes = 0

        var captureId: String?
        var firstError: Error?
        var failedFiles: [String] = []
        var unregisteredFiles: [String] = []
        let group = DispatchGroup()
        let errorLock = NSLock()

        var index = 0
        while index < files.count {
            let batch = Array(files[index..<min(index + initBatchSize, files.count)])
            index += initBatchSize
            do {
                // 3 attempts — a transient network blip on one init POST must not
                // orphan a whole batch (init-failed files have no manifest, so
                // nothing would ever retry them).
                captureId = try withRetries(3) {
                    try initAndStartBatch(
                        batch, captureId: captureId, group: group
                    ) { filename, error in
                        errorLock.lock()
                        failedFiles.append(filename)
                        if firstError == nil { firstError = error }
                        errorLock.unlock()
                    }
                }
            } catch {
                // First init failing means no capture exists yet — nothing to salvage.
                guard captureId != nil else { throw error }
                // A later batch failing must not abandon the uploads already running.
                // These files were never registered — they get no auto-retry.
                errorLock.lock()
                unregisteredFiles.append(contentsOf: batch.map { $0.filename })
                if firstError == nil { firstError = error }
                errorLock.unlock()
            }
        }

        group.wait()
        onStep?("Finishing up…")
        guard let cid = captureId else { throw UploadError.missing("captureId") }
        errorLock.lock()
        let failed = failedFiles
        let unregistered = unregisteredFiles
        let error = firstError
        errorLock.unlock()
        if failed.count + unregistered.count >= files.count, let error = error { throw error }
        return Outcome(captureId: cid, failedFiles: failed, unregisteredFiles: unregistered)
    }

    /// Runs `work` up to `attempts` times with a short growing delay between tries.
    private func withRetries<T>(_ attempts: Int, _ work: () throws -> T) throws -> T {
        var lastError: Error?
        for attempt in 1...max(1, attempts) {
            do { return try work() }
            catch {
                lastError = error
                if attempt < attempts { Thread.sleep(forTimeInterval: 2.0 * Double(attempt)) }
            }
        }
        throw lastError ?? UploadError.missing("retry result")
    }

    // MARK: - Workspace fallback

    /// Creates a quick-scan workspace and returns (spaceId, projectId). Used only when the
    /// web layer supplied no spaceId. POST /api/digital-twin/spaces { title, quick_scan }.
    private func createQuickScanSpace(title: String) throws -> (String, String) {
        let res = try postJSON("/api/digital-twin/spaces", [
            "title": title,
            "quick_scan": true,
        ])
        guard let space = res["space"] as? [String: Any],
              let sid = space["id"] as? String else {
            throw UploadError.missing("quick-scan space id")
        }
        let pid = (space["projectId"] as? String) ?? ""
        return (sid, pid)
    }

    // MARK: - Init + background engine

    /// Registers one batch of files with /upload/init and hands each to the background
    /// engine. Returns the captureId; does NOT wait for transfers — the caller's group
    /// gates on every file's completion. `onFileFailed` fires (engine queue) for each
    /// file whose upload permanently fails this session.
    private func initAndStartBatch(
        _ files: [FileEntry],
        captureId: String?,
        group: DispatchGroup,
        onFileFailed: @escaping (String, Error) -> Void
    ) throws -> String {
        let fileSpecs: [[String: Any]] = files.map { entry in
            var spec: [String: Any] = [
                "filename": entry.filename,
                "contentType": entry.contentType,
                "sizeBytes": fileSize(entry.url),
                "clientFingerprint": clientFingerprint(for: entry),
            ]
            if let kind = entry.assetKind { spec["assetKind"] = kind }
            return spec
        }
        var body: [String: Any] = [
            "space_id": spaceId,
            "project_id": projectId,
            "files": fileSpecs,
            "partSizeBytes": requestedPartBytes,
        ]
        if let cid = captureId { body["capture_id"] = cid }
        if let t = title { body["title"] = t }

        let res = try postJSON("/api/digital-twin/upload/init", body)
        guard let cid = res["captureId"] as? String,
              let uploads = res["uploads"] as? [[String: Any]] else {
            throw UploadError.missing("init response fields")
        }

        // Hand every file to the background engine. The engine persists per-part
        // progress, retries with re-sign, and POSTs /upload/complete itself (so it
        // also finishes after a background relaunch).
        //
        // NO throws below this point: earlier iterations have already entered the
        // caller's group and started engine transfers, so a malformed row must fail
        // ONLY its own file (via onFileFailed) — throwing here would make the caller
        // mark already-started files as failed too, and a spurious "everything
        // failed" could abort a walk whose uploads were actually landing.
        for (index, entry) in files.enumerated() {
            guard index < uploads.count else {
                onFileFailed(entry.filename, UploadError.missing("upload row \(index)"))
                continue
            }
            let upload = uploads[index]
            // Fingerprint dedup: this file's bytes already landed in a previous
            // attempt — count it as done and move on (retry-after-partial-failure).
            // Delete the local copy here: the engine only cleans up files it uploads.
            if (upload["alreadyComplete"] as? Bool) == true {
                addProgress(Int64(fileSize(entry.url)))
                try? FileManager.default.removeItem(at: entry.url)
                continue
            }
            guard let uploadId = upload["uploadId"] as? String,
                  let key = upload["key"] as? String,
                  let totalParts = (upload["totalParts"] as? NSNumber)?.intValue else {
                onFileFailed(entry.filename, UploadError.missing("multipart upload row"))
                continue
            }
            let partBytes = (upload["partSizeBytes"] as? NSNumber)?.intValue ?? requestedPartBytes

            let manifest = TwinUploadManifest(
                uploadId: uploadId,
                key: key,
                captureId: cid,
                assetId: upload["assetId"] as? String,
                apiBase: apiBase,
                filePath: entry.url.path,
                filename: entry.filename,
                contentType: entry.contentType,
                totalParts: totalParts,
                partSizeBytes: partBytes,
                fileSizeBytes: fileSize(entry.url),
                etags: [:]
            )

            onStep?(stepLabel(for: entry))
            let filename = entry.filename
            group.enter()
            TwinUploadSession.shared.start(
                manifest: manifest,
                cookieHeader: cookieHeader,
                onBytes: { [weak self] delta in self?.addProgress(delta) },
                onDone: { error in
                    if let error = error { onFileFailed(filename, error) }
                    group.leave()
                }
            )
        }
        return cid
    }

    private func addProgress(_ delta: Int64) {
        progressLock.lock()
        uploadedBytes += delta
        let frac = min(1.0, Double(uploadedBytes) / Double(totalBytes))
        progressLock.unlock()
        onProgress?(frac)
    }

    // MARK: - Helpers

    private func postJSON(_ path: String, _ body: [String: Any]) throws -> [String: Any] {
        try TwinUploadHTTP.postJSON(apiBase: apiBase, path: path, cookieHeader: cookieHeader, body: body)
    }

    private func fileSize(_ url: URL) -> Int {
        let attrs = try? FileManager.default.attributesOfItem(atPath: url.path)
        return (attrs?[.size] as? NSNumber)?.intValue ?? 0
    }

    /// A4: stable per-file identity, mirroring the web uploader's `twinAssetFingerprint`
    /// (name + size + lastModified — see lib/twin/asset-fingerprint.ts). The native
    /// uploader never sent this, so a retried/relaunched upload re-registered the same
    /// clip/PLY/poses file as a sibling `digital_twin_capture_assets` row instead of
    /// reusing it — the same triplicate-upload failure mode the web P0a fix closed, just
    /// still open on the path that matters (native capture is the primary LiDAR ingest).
    /// Server-side this is an opaque string compared for exact equality
    /// (`upsertTwinCaptureAsset`), so it does not need to match the JS hash bit-for-bit —
    /// only be stable across retries of the same on-disk clip file.
    private func clientFingerprint(for entry: FileEntry) -> String {
        let size = fileSize(entry.url)
        let attrs = try? FileManager.default.attributesOfItem(atPath: entry.url.path)
        let modifiedMillis: Int64
        if let modDate = attrs?[.modificationDate] as? Date {
            modifiedMillis = Int64(modDate.timeIntervalSince1970 * 1000)
        } else {
            modifiedMillis = 0
        }
        let name = entry.filename
        return "\(name.count):\(name):\(size):\(modifiedMillis)"
    }
}
