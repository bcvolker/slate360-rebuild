import Foundation

/// Singleton engine that owns the **background URLSession** carrying Twin part PUTs.
///
/// Why this exists (locked ~10-platform consensus, docs/design/TWIN_CAPTURE_UPLOAD_FIX.md):
/// the old uploader used an ephemeral session — locking the screen or backgrounding the
/// app mid-upload suspended the process and killed the in-flight PUT, which is why every
/// multi-minute capture upload failed. A background session hands the transfers to iOS's
/// out-of-process daemon: they keep going with the screen locked, the app suspended, or
/// even after the app is killed (iOS relaunches us via AppDelegate
/// `handleEventsForBackgroundURLSession`).
///
/// Design points:
/// - Singleton because background session identifiers must be unique per process.
/// - Parts are pre-signed in batch (6h expiry) and enqueued as `uploadTask(with:fromFile:)`
///   — file-based upload is mandatory for background continuation and removes the old
///   in-memory `Data` pressure. iOS runs up to `httpMaximumConnectionsPerHost` in parallel.
/// - Every completed part's ETag is persisted to the on-disk manifest immediately, so a
///   relaunch resumes ONLY the missing parts (`resumePendingUploads()`).
final class TwinUploadSession: NSObject, URLSessionDataDelegate {

    static let shared = TwinUploadSession()
    static let identifier = "ai.slate360.twin.upload.bg"

    /// Stored by AppDelegate when iOS relaunches the app for background-session events;
    /// called from `urlSessionDidFinishEvents` once all pending delegate messages land.
    var backgroundCompletionHandler: (() -> Void)?

    private struct Handlers {
        var onBytes: ((Int64) -> Void)?
        var onDone: ((Error?) -> Void)?
    }

    private let queue = DispatchQueue(label: "ai.slate360.twin.upload.engine")
    private var handlers: [String: Handlers] = [:]      // uploadId -> live callbacks
    private var cookieHeaders: [String: String] = [:]   // uploadId -> auth cookies (memory only)
    private var retryCounts: [String: Int] = [:]        // "uploadId|part" -> attempts
    private var activeUploads: Set<String> = []
    private let maxPartRetries = 5

    private lazy var session: URLSession = {
        let cfg = URLSessionConfiguration.background(withIdentifier: Self.identifier)
        cfg.isDiscretionary = false          // start now, don't let iOS defer to overnight
        cfg.sessionSendsLaunchEvents = true  // relaunch the app when transfers finish
        cfg.httpMaximumConnectionsPerHost = 4 // parallel parts (consensus: 3-4)
        cfg.timeoutIntervalForRequest = 300   // per-part stall ceiling (old code: 60s global)
        cfg.timeoutIntervalForResource = 24 * 3600
        return URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
    }()

    /// Forces session creation — used by the AppDelegate background-relaunch path so
    /// queued delegate events have a session to deliver into.
    func activate() { _ = session }

    // MARK: - Public API

    /// Starts (or resumes) one file's multipart upload. Callbacks fire on the engine queue.
    /// `excludingParts` skips parts that already have a live background task (resume path).
    func start(
        manifest: TwinUploadManifest,
        cookieHeader: String,
        onBytes: ((Int64) -> Void)?,
        onDone: ((Error?) -> Void)?,
        excludingParts: Set<Int> = []
    ) {
        queue.async {
            guard !self.activeUploads.contains(manifest.uploadId) else { return }
            self.activeUploads.insert(manifest.uploadId)
            self.handlers[manifest.uploadId] = Handlers(onBytes: onBytes, onDone: onDone)
            self.cookieHeaders[manifest.uploadId] = cookieHeader
            TwinUploadStore.shared.save(manifest)

            if manifest.isFullyUploaded {
                self.completeOnServer(manifest)
                return
            }
            let toUpload = manifest.missingParts.filter { !excludingParts.contains($0) }
            guard !toUpload.isEmpty else { return } // in-flight tasks will finish the file
            do {
                let signed = try self.signParts(manifest, partNumbers: toUpload, cookieHeader: cookieHeader)
                try self.enqueue(manifest, signed: signed)
            } catch {
                self.finish(manifest.uploadId, error: error)
            }
        }
    }

    /// Finishes any uploads interrupted by a crash/kill/relaunch: re-signs the missing
    /// parts and enqueues them; sessions whose parts all landed just re-POST complete.
    /// Parts whose background task survived the relaunch (iOS persists background-session
    /// tasks) are NOT re-enqueued — the live task's delegate events complete them.
    /// Called from the plugin's `load()` on every app launch. No-op when signed out.
    func resumePendingUploads() {
        queue.async {
            let manifests = TwinUploadStore.shared.loadAll()
            guard !manifests.isEmpty else { return }
            self.session.getAllTasks { tasks in
                let inFlight = Set(tasks
                    .filter { $0.state == .running || $0.state == .suspended }
                    .compactMap { $0.taskDescription })
                TwinUploadHTTP.fetchCookieHeader { header in
                    guard !header.isEmpty else { return } // not signed in yet — keep for later
                    self.queue.async {
                        for manifest in manifests where !self.activeUploads.contains(manifest.uploadId) {
                            // Source file gone and parts still missing → unrecoverable; drop it.
                            if !manifest.isFullyUploaded,
                               !FileManager.default.fileExists(atPath: manifest.filePath) {
                                TwinUploadStore.shared.remove(manifest.uploadId)
                                continue
                            }
                            let live = Set(manifest.missingParts.filter {
                                inFlight.contains("\(manifest.uploadId)|\($0)")
                            })
                            NSLog("[Slate360] Resuming twin upload \(manifest.uploadId) (\(manifest.missingParts.count)/\(manifest.totalParts) parts left, \(live.count) already in flight)")
                            self.start(manifest: manifest, cookieHeader: header,
                                       onBytes: nil, onDone: nil, excludingParts: live)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Signing + enqueue

    private func signParts(
        _ manifest: TwinUploadManifest,
        partNumbers: [Int],
        cookieHeader: String
    ) throws -> [Int: URL] {
        var out: [Int: URL] = [:]
        var index = 0
        while index < partNumbers.count {
            let batch = Array(partNumbers[index..<min(index + 200, partNumbers.count)])
            let res = try TwinUploadHTTP.postJSON(
                apiBase: manifest.apiBase,
                path: "/api/digital-twin/upload/sign-parts",
                cookieHeader: cookieHeader,
                body: ["uploadId": manifest.uploadId, "key": manifest.key, "partNumbers": batch]
            )
            guard let parts = res["parts"] as? [[String: Any]] else {
                throw TwinUploader.UploadError.missing("sign-parts response")
            }
            for part in parts {
                if let n = (part["partNumber"] as? NSNumber)?.intValue,
                   let s = part["signedUrl"] as? String, let url = URL(string: s) {
                    out[n] = url
                }
            }
            index += 200
        }
        return out
    }

    private func enqueue(_ manifest: TwinUploadManifest, signed: [Int: URL]) throws {
        for (partNumber, url) in signed {
            let partFile = try ensurePartFile(manifest, partNumber: partNumber)
            var req = URLRequest(url: url)
            req.httpMethod = "PUT"
            req.setValue(manifest.contentType, forHTTPHeaderField: "Content-Type")
            let task = session.uploadTask(with: req, fromFile: partFile)
            task.taskDescription = "\(manifest.uploadId)|\(partNumber)"
            task.resume()
        }
    }

    /// Slices one part out of the source file to its stable on-disk path (idempotent —
    /// an existing slice of the right size is reused on retry/resume).
    private func ensurePartFile(_ manifest: TwinUploadManifest, partNumber: Int) throws -> URL {
        let url = TwinUploadStore.shared.partFileURL(uploadId: manifest.uploadId, partNumber: partNumber)
        let expected = manifest.sizeOfPart(partNumber)
        if let attrs = try? FileManager.default.attributesOfItem(atPath: url.path),
           (attrs[.size] as? NSNumber)?.intValue == expected {
            return url
        }
        let handle = try FileHandle(forReadingFrom: URL(fileURLWithPath: manifest.filePath))
        defer { try? handle.close() }
        try handle.seek(toOffset: UInt64((partNumber - 1) * manifest.partSizeBytes))
        let chunk = handle.readData(ofLength: expected)
        guard chunk.count == expected else {
            throw TwinUploader.UploadError.missing("part \(partNumber) bytes (file truncated?)")
        }
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try chunk.write(to: url, options: .atomic)
        return url
    }

    // MARK: - Completion + retry

    private func completeOnServer(_ manifest: TwinUploadManifest) {
        withCookie(manifest.uploadId) { header in
            self.queue.async {
                let parts: [[String: Any]] = (1...manifest.totalParts).compactMap { n in
                    guard let etag = manifest.etags[n] else { return nil }
                    return ["partNumber": n, "etag": etag, "sizeBytes": manifest.sizeOfPart(n)]
                }
                var lastError: Error?
                for attempt in 1...3 {
                    do {
                        _ = try TwinUploadHTTP.postJSON(
                            apiBase: manifest.apiBase,
                            path: "/api/digital-twin/upload/complete",
                            cookieHeader: header,
                            body: ["uploadId": manifest.uploadId, "key": manifest.key, "parts": parts]
                        )
                        TwinUploadStore.shared.remove(manifest.uploadId)
                        NSLog("[Slate360] Twin multipart complete: \(manifest.filename)")
                        self.finish(manifest.uploadId, error: nil)
                        return
                    } catch {
                        lastError = error
                        Thread.sleep(forTimeInterval: 0.5 * Double(attempt))
                    }
                }
                // Leave the manifest on disk — the resume pass re-POSTs complete next launch.
                self.finish(manifest.uploadId, error: lastError)
            }
        }
    }

    private func retryPart(_ manifest: TwinUploadManifest, partNumber: Int, underlying: Error?) {
        let key = "\(manifest.uploadId)|\(partNumber)"
        let attempts = (retryCounts[key] ?? 0) + 1
        retryCounts[key] = attempts
        guard attempts <= maxPartRetries else {
            finish(manifest.uploadId, error: underlying ?? TwinUploader.UploadError.missing("part \(partNumber) after \(maxPartRetries) retries"))
            return
        }
        let backoff = min(30.0, pow(2.0, Double(attempts)))
        queue.asyncAfter(deadline: .now() + backoff) {
            self.withCookie(manifest.uploadId) { header in
                self.queue.async {
                    guard let fresh = TwinUploadStore.shared.load(manifest.uploadId),
                          fresh.etags[partNumber] == nil else { return }
                    do {
                        // Re-sign just this part (covers expired presigned URLs too).
                        let signed = try self.signParts(fresh, partNumbers: [partNumber], cookieHeader: header)
                        try self.enqueue(fresh, signed: signed)
                    } catch {
                        self.finish(fresh.uploadId, error: error)
                    }
                }
            }
        }
    }

    private func finish(_ uploadId: String, error: Error?) {
        let done = handlers[uploadId]?.onDone
        handlers[uploadId] = nil
        cookieHeaders[uploadId] = nil
        activeUploads.remove(uploadId)
        retryCounts = retryCounts.filter { !$0.key.hasPrefix(uploadId + "|") }
        done?(error)
    }

    /// Uses the in-memory cookie header when the upload started this launch; falls back
    /// to reading the WKWebView cookie store (resume + background-relaunch paths).
    private func withCookie(_ uploadId: String, _ block: @escaping (String) -> Void) {
        if let header = cookieHeaders[uploadId], !header.isEmpty {
            block(header)
        } else {
            TwinUploadHTTP.fetchCookieHeader { block($0) }
        }
    }

    // MARK: - URLSessionDelegate

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didSendBodyData bytesSent: Int64,
        totalBytesSent: Int64,
        totalBytesExpectedToSend: Int64
    ) {
        guard let desc = task.taskDescription,
              let uploadId = desc.split(separator: "|").first.map(String.init) else { return }
        queue.async { self.handlers[uploadId]?.onBytes?(bytesSent) }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let desc = task.taskDescription else { return }
        let pieces = desc.split(separator: "|")
        guard pieces.count == 2, let partNumber = Int(pieces[1]) else { return }
        let uploadId = String(pieces[0])
        let http = task.response as? HTTPURLResponse
        let etag = http?.value(forHTTPHeaderField: "Etag") ?? http?.value(forHTTPHeaderField: "ETag") ?? ""

        queue.async {
            guard var manifest = TwinUploadStore.shared.load(uploadId) else { return }
            guard manifest.etags[partNumber] == nil else { return } // duplicate event

            let ok = error == nil
                && (200..<300).contains(http?.statusCode ?? 0)
                && !etag.isEmpty
            if ok {
                manifest.etags[partNumber] = etag
                TwinUploadStore.shared.save(manifest)
                TwinUploadStore.shared.removePartFile(uploadId: uploadId, partNumber: partNumber)
                if manifest.isFullyUploaded {
                    self.completeOnServer(manifest)
                }
            } else {
                let statusMsg = http.map { "HTTP \($0.statusCode)" } ?? (error?.localizedDescription ?? "network error")
                NSLog("[Slate360] Twin part \(partNumber) of \(manifest.filename) failed (\(statusMsg)) — retrying")
                self.retryPart(manifest, partNumber: partNumber, underlying: error)
            }
        }
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        DispatchQueue.main.async {
            self.backgroundCompletionHandler?()
            self.backgroundCompletionHandler = nil
        }
    }
}
