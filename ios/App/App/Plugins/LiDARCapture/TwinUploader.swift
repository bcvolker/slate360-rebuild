import Foundation

/// Native direct-to-storage uploader for Twin captures.
///
/// Mirrors the web multipart pipeline (`hooks/twin-upload-runners.ts`) but runs
/// entirely in native code so large capture files NEVER pass through the WKWebView
/// JS heap. Pulling a multi-hundred-MB MP4 into a JS `Blob`
/// (`fetch(convertFileSrc(uri)).blob()`) on the remote-origin webview destabilised the
/// WebContent process; Capacitor recovered by reloading, which surfaced as the
/// post-capture "Load failed" page. Uploading from native sidesteps that entirely —
/// the web layer only ever receives a `captureId`.
///
/// API contract (all POSTs carry the WKWebView Supabase auth cookies as a `Cookie`
/// header; PUTs go straight to the presigned storage URL with no extra headers):
///   - files >= 8 MiB  → POST /upload/init → per-part POST /upload/sign-part →
///                       PUT presigned → POST /upload/complete
///   - files <  8 MiB  → POST /upload/single {presign} → PUT presigned →
///                       POST /upload/single {finalize}
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

    // 8 MiB — must equal TWIN_MULTIPART_PART_BYTES / TWIN_SINGLE_UPLOAD_MAX_BYTES on the server.
    private let partSize = 8 * 1024 * 1024

    private let apiBase: String
    private let cookieHeader: String
    private var spaceId: String
    private var projectId: String
    private let title: String?
    private let session: URLSession

    init(apiBase: String, cookieHeader: String, spaceId: String, projectId: String, title: String?) {
        // Trim any trailing slash so apiBase + "/api/..." is well-formed.
        self.apiBase = apiBase.hasSuffix("/") ? String(apiBase.dropLast()) : apiBase
        self.cookieHeader = cookieHeader
        self.spaceId = spaceId
        self.projectId = projectId
        self.title = title
        let cfg = URLSessionConfiguration.ephemeral
        cfg.timeoutIntervalForRequest = 120
        cfg.timeoutIntervalForResource = 3600
        cfg.httpShouldSetCookies = false // we attach cookies explicitly
        self.session = URLSession(configuration: cfg)
    }

    /// Uploads every file and returns the resulting capture id. Blocking — call on a
    /// background queue. Throws `UploadError` (or the underlying URL error) on failure.
    func upload(files: [FileEntry]) throws -> String {
        // Self-heal: if the web layer didn't pass a workspace (e.g. a stale cached web
        // bundle), create a quick-scan space natively so the capture isn't lost. Mirrors
        // the web's bootQuickScan call.
        if spaceId.isEmpty {
            let (sid, pid) = try createQuickScanSpace(title: title ?? "Quick scan")
            spaceId = sid
            projectId = pid
        }

        var captureId: String?
        let multipart = files.filter { fileSize($0.url) >= partSize }
        let singles = files.filter { fileSize($0.url) < partSize }

        if !multipart.isEmpty {
            captureId = try initAndUploadMultipart(multipart, captureId: captureId)
        }
        for entry in singles {
            captureId = try uploadSingle(entry, captureId: captureId)
        }

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

    // MARK: - Multipart

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
        ]
        if let cid = captureId { body["capture_id"] = cid }
        if let t = title { body["title"] = t }

        let res = try postJSON("/api/digital-twin/upload/init", body)
        guard let cid = res["captureId"] as? String,
              let uploads = res["uploads"] as? [[String: Any]] else {
            throw UploadError.missing("init response fields")
        }

        for (index, entry) in files.enumerated() {
            guard index < uploads.count else { throw UploadError.missing("upload row \(index)") }
            try uploadMultipartFile(entry, upload: uploads[index])
        }
        return cid
    }

    private func uploadMultipartFile(_ entry: FileEntry, upload: [String: Any]) throws {
        guard let uploadId = upload["uploadId"] as? String,
              let key = upload["key"] as? String,
              let totalParts = (upload["totalParts"] as? NSNumber)?.intValue else {
            throw UploadError.missing("multipart upload row")
        }
        let partBytes = (upload["partSizeBytes"] as? NSNumber)?.intValue ?? partSize

        let handle = try FileHandle(forReadingFrom: entry.url)
        defer { try? handle.close() }

        var parts: [[String: Any]] = []
        for partNumber in 1...max(1, totalParts) {
            try handle.seek(toOffset: UInt64((partNumber - 1) * partBytes))
            let chunk = handle.readData(ofLength: partBytes)

            // Re-sign per attempt (presigned part URLs expire in 15 min) — mirrors web.
            var etag: String?
            var lastError: Error?
            for attempt in 1...3 {
                do {
                    let sign = try postJSON("/api/digital-twin/upload/sign-part", [
                        "uploadId": uploadId,
                        "key": key,
                        "partNumber": partNumber,
                    ])
                    guard let signed = sign["signedUrl"] as? String, let url = URL(string: signed) else {
                        throw UploadError.missing("signedUrl")
                    }
                    etag = try putData(url, chunk, contentType: entry.contentType)
                    break
                } catch {
                    lastError = error
                    Thread.sleep(forTimeInterval: 0.5 * Double(attempt))
                }
            }
            guard let resolvedEtag = etag else {
                throw lastError ?? UploadError.missing("ETag for part \(partNumber)")
            }
            parts.append(["partNumber": partNumber, "etag": resolvedEtag, "sizeBytes": chunk.count])
        }

        _ = try postJSON("/api/digital-twin/upload/complete", [
            "uploadId": uploadId,
            "key": key,
            "parts": parts,
        ])
    }

    // MARK: - Single

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
            do { _ = try putData(url, data, contentType: entry.contentType); ok = true; break }
            catch { lastError = error; Thread.sleep(forTimeInterval: 0.5 * Double(attempt)) }
        }
        guard ok else { throw lastError ?? UploadError.missing("single PUT") }

        _ = try postJSON("/api/digital-twin/upload/single", [
            "phase": "finalize",
            "assetId": assetId,
            "key": key,
            "sizeBytes": size,
        ])
        return cid
    }

    // MARK: - HTTP helpers

    private func postJSON(_ path: String, _ body: [String: Any]) throws -> [String: Any] {
        guard let url = URL(string: apiBase + path) else { throw UploadError.missing("URL for \(path)") }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if !cookieHeader.isEmpty { req.setValue(cookieHeader, forHTTPHeaderField: "Cookie") }
        req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])

        let (data, response) = try syncRequest(req, uploadBody: nil)
        guard let http = response as? HTTPURLResponse else { throw UploadError.missing("HTTP response") }
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
        guard (200..<300).contains(http.statusCode) else {
            let msg = (json["error"] as? String) ?? (String(data: data, encoding: .utf8) ?? "")
            throw UploadError.http(http.statusCode, msg)
        }
        return json
    }

    @discardableResult
    private func putData(_ url: URL, _ data: Data, contentType: String) throws -> String {
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        req.setValue(contentType, forHTTPHeaderField: "Content-Type")
        let (_, response) = try syncRequest(req, uploadBody: data)
        guard let http = response as? HTTPURLResponse else { throw UploadError.missing("PUT response") }
        guard (200..<300).contains(http.statusCode) else {
            throw UploadError.http(http.statusCode, "storage PUT")
        }
        let etag = http.value(forHTTPHeaderField: "Etag") ?? http.value(forHTTPHeaderField: "ETag") ?? ""
        guard !etag.isEmpty else { throw UploadError.missing("ETag header") }
        return etag
    }

    /// Runs a URLSession task synchronously on the calling (background) queue. `uploadBody`
    /// non-nil ⇒ uploadTask (streams from memory); nil ⇒ dataTask.
    private func syncRequest(_ req: URLRequest, uploadBody: Data?) throws -> (Data, URLResponse) {
        var outData: Data?
        var outResponse: URLResponse?
        var outError: Error?
        let semaphore = DispatchSemaphore(value: 0)

        let completion: (Data?, URLResponse?, Error?) -> Void = { data, response, error in
            outData = data; outResponse = response; outError = error; semaphore.signal()
        }
        let task: URLSessionTask = uploadBody != nil
            ? session.uploadTask(with: req, from: uploadBody!, completionHandler: completion)
            : session.dataTask(with: req, completionHandler: completion)
        task.resume()
        semaphore.wait()

        if let error = outError { throw error }
        guard let response = outResponse else { throw UploadError.missing("response") }
        return (outData ?? Data(), response)
    }

    private func fileSize(_ url: URL) -> Int {
        let attrs = try? FileManager.default.attributesOfItem(atPath: url.path)
        return (attrs?[.size] as? NSNumber)?.intValue ?? 0
    }
}
