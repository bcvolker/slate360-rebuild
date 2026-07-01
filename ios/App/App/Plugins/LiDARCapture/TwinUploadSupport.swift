import Foundation
import WebKit

/// On-disk record of one in-flight multipart upload (one file). Persisted after every
/// part completion so an interrupted upload resumes from the last completed part —
/// across per-part retries, app suspension, and full app relaunches — instead of
/// restarting from part 1 (the old uploader threw all progress away).
struct TwinUploadManifest: Codable {
    let uploadId: String        // digital_twin_multipart_uploads.id (server session id)
    let key: String             // storage key in R2
    let captureId: String
    let apiBase: String
    let filePath: String        // absolute path of the source capture file
    let filename: String
    let contentType: String
    let totalParts: Int
    let partSizeBytes: Int
    let fileSizeBytes: Int
    var etags: [Int: String]    // partNumber -> ETag (only successfully PUT parts)

    var missingParts: [Int] {
        (1...max(1, totalParts)).filter { etags[$0] == nil }
    }

    var isFullyUploaded: Bool { etags.count >= totalParts }

    /// Exact byte size of a given part (the last part is the remainder).
    func sizeOfPart(_ partNumber: Int) -> Int {
        if partNumber < totalParts { return partSizeBytes }
        return max(0, fileSizeBytes - (totalParts - 1) * partSizeBytes)
    }
}

/// Persists manifests + part slice files under Application Support/TwinUploads/<uploadId>/.
/// Part slices get a stable on-disk path for the lifetime of their background
/// uploadTask(with:fromFile:) and are deleted individually as parts complete.
final class TwinUploadStore {
    static let shared = TwinUploadStore()
    private let queue = DispatchQueue(label: "ai.slate360.twin.upload.store")
    private let fm = FileManager.default

    private var rootDir: URL {
        let base = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("TwinUploads", isDirectory: true)
    }

    func dir(for uploadId: String) -> URL {
        rootDir.appendingPathComponent(uploadId, isDirectory: true)
    }

    private func manifestURL(_ uploadId: String) -> URL {
        dir(for: uploadId).appendingPathComponent("manifest.json")
    }

    func partFileURL(uploadId: String, partNumber: Int) -> URL {
        dir(for: uploadId).appendingPathComponent("part-\(partNumber).bin")
    }

    func save(_ manifest: TwinUploadManifest) {
        queue.sync {
            try? fm.createDirectory(at: dir(for: manifest.uploadId), withIntermediateDirectories: true)
            if let data = try? JSONEncoder().encode(manifest) {
                try? data.write(to: manifestURL(manifest.uploadId), options: .atomic)
            }
        }
    }

    func load(_ uploadId: String) -> TwinUploadManifest? {
        queue.sync {
            guard let data = try? Data(contentsOf: manifestURL(uploadId)) else { return nil }
            return try? JSONDecoder().decode(TwinUploadManifest.self, from: data)
        }
    }

    func loadAll() -> [TwinUploadManifest] {
        queue.sync {
            guard let children = try? fm.contentsOfDirectory(at: rootDir, includingPropertiesForKeys: nil) else {
                return []
            }
            return children.compactMap { child in
                guard let data = try? Data(contentsOf: child.appendingPathComponent("manifest.json")) else {
                    return nil
                }
                return try? JSONDecoder().decode(TwinUploadManifest.self, from: data)
            }
        }
    }

    func removePartFile(uploadId: String, partNumber: Int) {
        queue.sync { try? fm.removeItem(at: partFileURL(uploadId: uploadId, partNumber: partNumber)) }
    }

    func remove(_ uploadId: String) {
        queue.sync { try? fm.removeItem(at: dir(for: uploadId)) }
    }
}

/// Small blocking HTTP helpers shared by the uploader facade and the background engine.
/// API calls (init/sign/complete) are small + quick, so they use a plain ephemeral
/// session — only the large part PUTs ride the background session.
enum TwinUploadHTTP {
    static let api: URLSession = {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.timeoutIntervalForRequest = 60
        cfg.timeoutIntervalForResource = 600
        cfg.httpShouldSetCookies = false // cookies attached explicitly per request
        return URLSession(configuration: cfg)
    }()

    /// Blocking JSON POST. Call off the main thread. Throws TwinUploader.UploadError.
    static func postJSON(
        apiBase: String,
        path: String,
        cookieHeader: String,
        body: [String: Any]
    ) throws -> [String: Any] {
        guard let url = URL(string: apiBase + path) else {
            throw TwinUploader.UploadError.missing("URL for \(path)")
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if !cookieHeader.isEmpty { req.setValue(cookieHeader, forHTTPHeaderField: "Cookie") }
        req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])

        var outData: Data?
        var outResponse: URLResponse?
        var outError: Error?
        let semaphore = DispatchSemaphore(value: 0)
        api.dataTask(with: req) { data, response, error in
            outData = data; outResponse = response; outError = error; semaphore.signal()
        }.resume()
        semaphore.wait()

        if let error = outError { throw error }
        guard let http = outResponse as? HTTPURLResponse else {
            throw TwinUploader.UploadError.missing("HTTP response")
        }
        let json = (try? JSONSerialization.jsonObject(with: outData ?? Data())) as? [String: Any] ?? [:]
        guard (200..<300).contains(http.statusCode) else {
            let msg = (json["error"] as? String) ?? (String(data: outData ?? Data(), encoding: .utf8) ?? "")
            throw TwinUploader.UploadError.http(http.statusCode, msg)
        }
        return json
    }

    /// Blocking in-memory PUT (small files only — the single-upload path).
    @discardableResult
    static func putData(_ url: URL, _ data: Data, contentType: String) throws -> String {
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        req.setValue(contentType, forHTTPHeaderField: "Content-Type")

        var outResponse: URLResponse?
        var outError: Error?
        let semaphore = DispatchSemaphore(value: 0)
        api.uploadTask(with: req, from: data) { _, response, error in
            outResponse = response; outError = error; semaphore.signal()
        }.resume()
        semaphore.wait()

        if let error = outError { throw error }
        guard let http = outResponse as? HTTPURLResponse else {
            throw TwinUploader.UploadError.missing("PUT response")
        }
        guard (200..<300).contains(http.statusCode) else {
            throw TwinUploader.UploadError.http(http.statusCode, "storage PUT")
        }
        let etag = http.value(forHTTPHeaderField: "Etag") ?? http.value(forHTTPHeaderField: "ETag") ?? ""
        guard !etag.isEmpty else { throw TwinUploader.UploadError.missing("ETag header") }
        return etag
    }

    /// Reads the WKWebView cookie store (works with no live WebView — e.g. during a
    /// background relaunch or the resume-on-launch pass) into a `Cookie:` header.
    /// Supabase chunks its auth token across several cookies, so forward all of them.
    static func fetchCookieHeader(completion: @escaping (String) -> Void) {
        DispatchQueue.main.async {
            WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
                let header = cookies
                    .filter { $0.domain.contains("slate360.ai") }
                    .map { "\($0.name)=\($0.value)" }
                    .joined(separator: "; ")
                completion(header)
            }
        }
    }
}
