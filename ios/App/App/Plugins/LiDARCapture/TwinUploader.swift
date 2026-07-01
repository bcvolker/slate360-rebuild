import Foundation

/// Native direct-to-storage uploader for Twin captures.
///
/// Mirrors the web multipart pipeline (`hooks/twin-upload-runners.ts`) but runs
/// entirely in native code so large capture files NEVER pass through the WKWebView
/// JS heap (pulling a multi-hundred-MB MP4 into a JS `Blob` destabilised the
/// WebContent process — the post-capture "Load failed" crash).
///
/// Rebuilt 2026-07-01 per the locked upload consensus (TWIN_CAPTURE_UPLOAD_FIX.md):
/// large files ride a **background URLSession** (`TwinUploadSession`) as file-based
/// parallel part PUTs with on-disk resume state, so screen-lock/backgrounding no
/// longer kills the upload and a relaunch resumes only the missing parts. This class
/// stays the per-capture orchestrator and keeps the old blocking contract:
///   - files >= 8 MiB  → POST /upload/init (16 MiB parts) → batch sign-parts →
///                       background PUTs → POST /upload/complete (engine-driven)
///   - files <  8 MiB  → POST /upload/single {presign} → PUT → {finalize} (inline)
/// A single `captureId` threads through every call so all assets attach to one capture.
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

    // Multipart threshold — must equal TWIN_MULTIPART_PART_BYTES / TWIN_SINGLE_UPLOAD_MAX_BYTES
    // on the server (files below this go through /upload/single).
    private let multipartThreshold = 8 * 1024 * 1024
    // Requested part size — bigger parts (16 MiB, consensus range 16-25) mean fewer
    // round trips and better cellular throughput. The server clamps and its response
    // (`partSizeBytes`) is authoritative.
    private let requestedPartBytes = 16 * 1024 * 1024

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

    /// Uploads every file and returns the resulting capture id. Blocking — call on a
    /// background queue. Throws `UploadError` (or the underlying URL error) on failure.
    /// The heavy transfers run on the background session, so the app being locked or
    /// suspended mid-upload pauses this thread but no longer kills the upload.
    func upload(files: [FileEntry]) throws -> String {
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
        let multipart = files.filter { fileSize($0.url) >= multipartThreshold }
        let singles = files.filter { fileSize($0.url) < multipartThreshold }

        if !multipart.isEmpty {
            captureId = try initAndUploadMultipart(multipart, captureId: captureId)
        }
        for entry in singles {
            onStep?(stepLabel(for: entry))
            captureId = try uploadSingle(entry, captureId: captureId)
        }

        onStep?("Finishing up…")
        guard let cid = captureId else { throw UploadError.missing("captureId") }
        return cid
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

    // MARK: - Multipart (background engine)

    private func initAndUploadMultipart(_ files: [FileEntry], captureId: String?) throws -> String {
        let fileSpecs: [[String: Any]] = files.map { entry in
            var spec: [String: Any] = [
                "filename": entry.filename,
                "contentType": entry.contentType,
                "sizeBytes": fileSize(entry.url),
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

        // Hand every file to the background engine, then block until all complete.
        // The engine persists per-part progress, retries with re-sign, and POSTs
        // /upload/complete itself (so it also finishes after a background relaunch).
        let group = DispatchGroup()
        let errorLock = NSLock()
        var uploadErrors: [Error] = []

        for (index, entry) in files.enumerated() {
            guard index < uploads.count else { throw UploadError.missing("upload row \(index)") }
            let upload = uploads[index]
            guard let uploadId = upload["uploadId"] as? String,
                  let key = upload["key"] as? String,
                  let totalParts = (upload["totalParts"] as? NSNumber)?.intValue else {
                throw UploadError.missing("multipart upload row")
            }
            let partBytes = (upload["partSizeBytes"] as? NSNumber)?.intValue ?? requestedPartBytes

            let manifest = TwinUploadManifest(
                uploadId: uploadId,
                key: key,
                captureId: cid,
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
            group.enter()
            TwinUploadSession.shared.start(
                manifest: manifest,
                cookieHeader: cookieHeader,
                onBytes: { [weak self] delta in self?.addProgress(delta) },
                onDone: { error in
                    if let error = error {
                        errorLock.lock(); uploadErrors.append(error); errorLock.unlock()
                    }
                    group.leave()
                }
            )
        }

        group.wait()
        if let first = uploadErrors.first { throw first }
        return cid
    }

    private func addProgress(_ delta: Int64) {
        progressLock.lock()
        uploadedBytes += delta
        let frac = min(1.0, Double(uploadedBytes) / Double(totalBytes))
        progressLock.unlock()
        onProgress?(frac)
    }

    // MARK: - Single (small files, inline)

    private func uploadSingle(_ entry: FileEntry, captureId: String?) throws -> String {
        let size = fileSize(entry.url)
        var presignBody: [String: Any] = [
            "phase": "presign",
            "space_id": spaceId,
            "project_id": projectId,
            "filename": entry.filename,
            "contentType": entry.contentType,
            "sizeBytes": size,
        ]
        if let cid = captureId { presignBody["capture_id"] = cid }
        if let t = title { presignBody["title"] = t }
        if let kind = entry.assetKind { presignBody["assetKind"] = kind }

        let presign = try postJSON("/api/digital-twin/upload/single", presignBody)
        guard let cid = presign["captureId"] as? String,
              let assetId = presign["assetId"] as? String,
              let key = presign["key"] as? String,
              let signed = presign["signedUrl"] as? String,
              let url = URL(string: signed) else {
            throw UploadError.missing("single presign response")
        }

        let data = try Data(contentsOf: entry.url, options: .mappedIfSafe)
        var lastError: Error?
        var ok = false
        for attempt in 1...3 {
            do { _ = try TwinUploadHTTP.putData(url, data, contentType: entry.contentType); ok = true; break }
            catch { lastError = error; Thread.sleep(forTimeInterval: 0.5 * Double(attempt)) }
        }
        guard ok else { throw lastError ?? UploadError.missing("single PUT") }
        addProgress(Int64(data.count))

        _ = try postJSON("/api/digital-twin/upload/single", [
            "phase": "finalize",
            "assetId": assetId,
            "key": key,
            "sizeBytes": size,
        ])
        return cid
    }

    // MARK: - Helpers

    private func postJSON(_ path: String, _ body: [String: Any]) throws -> [String: Any] {
        try TwinUploadHTTP.postJSON(apiBase: apiBase, path: path, cookieHeader: cookieHeader, body: body)
    }

    private func fileSize(_ url: URL) -> Int {
        let attrs = try? FileManager.default.attributesOfItem(atPath: url.path)
        return (attrs?[.size] as? NSNumber)?.intValue ?? 0
    }
}
