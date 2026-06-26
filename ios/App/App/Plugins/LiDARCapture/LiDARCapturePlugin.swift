import Foundation
import UIKit
import Capacitor
import ARKit
import CoreLocation
import simd

// MARK: - Data structures

private struct PointData {
    var position: SIMD3<Float>
    var color: SIMD3<UInt8>
}

// SIMD3<Int32> is Hashable natively — used as voxel grid key.

// MARK: - Plugin

@objc(LiDARCapturePlugin)
public class LiDARCapturePlugin: CAPPlugin, CAPBridgedPlugin, ARSessionDelegate, CLLocationManagerDelegate {

    // CAPBridgedPlugin registration — guarantees runtime discovery under SPM (no Obj-C dead-strip).
    public let identifier = "LiDARCapturePlugin"
    public let jsName = "LiDARCapture"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dismissCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cleanup", returnType: CAPPluginReturnPromise),
    ]

    // Native-led capture (modal AR view controller).
    private var pendingCaptureCall: CAPPluginCall?
    private weak var captureVC: TwinARKitCaptureViewController?

    // Serial queue for the native direct-to-storage upload (blocking URLSession calls).
    private let uploadQueue = DispatchQueue(label: "ai.slate360.twin.upload", qos: .userInitiated)

    // MARK: State

    private var arSession: ARSession?
    private var locationManager: CLLocationManager?
    private var currentLocation: CLLocation?

    private var isRunning = false
    private var sessionId = ""

    // Voxel deduplication at 2 cm resolution.
    private var voxelGrid: [SIMD3<Int32>: PointData] = [:]
    private var keyframes: [[String: Any]] = []

    private let voxelSize: Float = 0.02
    private let maxPoints = 500_000
    private let keyframeInterval: TimeInterval = 0.5
    private var lastKeyframeTime: TimeInterval = 0

    private var confidenceThreshold: ARConfidenceLevel = .medium

    // Progress timer fires on main queue — keeps notifyListeners off the
    // per-frame ARSession delegate which runs on an internal ARKit thread.
    private var progressTimer: Timer?

    // Serialise all point/keyframe mutations onto a dedicated queue to avoid
    // data races between the ARSession delegate thread and export calls.
    private let dataQueue = DispatchQueue(label: "ai.slate360.lidar.data", qos: .userInitiated)

    private var sessionStartTime: Double = 0

    // MARK: - Plugin API

    @objc func isAvailable(_ call: CAPPluginCall) {
        let supportsDepth = ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) ||
                            ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth)
        // `nativeCapture: true` signals this build has the native-led presentCapture flow,
        // so the web layer only routes there when the installed app actually supports it.
        call.resolve([
            "available": ARWorldTrackingConfiguration.isSupported && supportsDepth,
            "nativeCapture": true,
        ])
    }

    /// Native-led capture: presents a full-screen ARKit capture VC that owns the camera and
    /// produces video + PLY + poses. Resolves (after dismissal) with the capture manifest.
    @objc func presentCapture(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard self.pendingCaptureCall == nil else {
                call.reject("Capture already active"); return
            }
            guard let host = self.bridge?.viewController else {
                call.reject("No host view controller"); return
            }
            let opts = TwinCaptureOptions.from(
                confidence: call.getString("confidence"),
                maxDurationSec: call.getDouble("maxDurationSec"),
                maxPoints: call.getInt("maxPoints")
            )
            // Upload target — the native uploader pushes the capture files straight to
            // storage so they never cross into the JS heap (the "Load failed" crash).
            let spaceId = call.getString("spaceId") ?? ""
            let projectId = call.getString("projectId") ?? ""
            let apiBase = call.getString("apiBase") ?? "https://www.slate360.ai"
            let title = call.getString("title")
            self.pendingCaptureCall = call
            let vc = TwinARKitCaptureViewController(options: opts)
            vc.onProgress = { [weak self] data in self?.notifyListeners("progress", data: data) }
            vc.onFinish = { [weak self] manifest in
                guard let self = self else { return }
                vc.dismiss(animated: true) {
                    self.captureVC = nil
                    self.uploadCapture(
                        manifest: manifest,
                        spaceId: spaceId,
                        projectId: projectId,
                        apiBase: apiBase,
                        title: title
                    )
                }
            }
            vc.onCancel = { [weak self] in
                guard let self = self else { return }
                vc.dismiss(animated: true) {
                    self.captureVC = nil
                    self.pendingCaptureCall?.resolve(["cancelled": true])
                    self.pendingCaptureCall = nil
                }
            }
            vc.onFatalError = { [weak self] message in
                guard let self = self else { return }
                vc.dismiss(animated: true) {
                    self.captureVC = nil
                    self.pendingCaptureCall?.reject(message)
                    self.pendingCaptureCall = nil
                }
            }
            self.captureVC = vc
            host.present(vc, animated: true)
        }
    }

    // MARK: - Native upload

    /// Reads the capture's temp files into the native uploader (off the main thread) and
    /// resolves the pending JS call with `{ captureId, uploaded: true }`. On failure it
    /// resolves with `{ uploadError, errorCode? }` so the web layer renders a friendly
    /// message instead of throwing. The local file:// URIs are stripped from the manifest —
    /// the web layer must never fetch them (that is the crash this whole path avoids).
    private func uploadCapture(
        manifest: [String: Any],
        spaceId: String,
        projectId: String,
        apiBase: String,
        title: String?
    ) {
        var entries: [TwinUploader.FileEntry] = []
        if let v = manifest["videoUri"] as? String, let url = URL(string: v) {
            entries.append(.init(url: url, filename: "twin_capture.mp4", contentType: "video/mp4", assetKind: "video"))
        }
        if let p = manifest["plyUri"] as? String, let url = URL(string: p) {
            entries.append(.init(url: url, filename: "lidar_capture.ply", contentType: "application/octet-stream", assetKind: "ply_lidar"))
        }
        if let po = manifest["posesUri"] as? String, let url = URL(string: po) {
            entries.append(.init(url: url, filename: "lidar_poses.json", contentType: "application/json", assetKind: "lidar_poses"))
        }

        guard !entries.isEmpty else {
            resolveCapture(["cancelled": false, "uploadError": "No capture files were produced."])
            return
        }

        let pts = (manifest["pointCount"] as? NSNumber)?.intValue ?? 0

        // Tell the web layer we've left capture and started uploading (presentCapture is
        // still awaiting; native resolves only once the upload completes).
        notifyListeners("uploadPhase", data: ["phase": "uploading"])

        collectCookieHeader { [weak self] cookieHeader in
            guard let self = self else { return }
            self.uploadQueue.async {
                // Pass spaceId through even if empty — the uploader self-heals by creating a
                // quick-scan workspace, so a stale web bundle can't strand the capture.
                let uploader = TwinUploader(
                    apiBase: apiBase,
                    cookieHeader: cookieHeader,
                    spaceId: spaceId,
                    projectId: projectId,
                    title: title
                )
                // Forward each upload step to the web so the spinner shows live progress
                // ("Uploading video…", "Finishing up…") instead of a silent "Uploading scan…".
                uploader.onStep = { [weak self] label in
                    self?.notifyListeners("uploadPhase", data: ["phase": "uploading", "label": label])
                }
                do {
                    let captureId = try uploader.upload(files: entries)
                    NSLog("[Slate360] Twin native upload complete; captureId=\(captureId)")
                    for entry in entries { try? FileManager.default.removeItem(at: entry.url) }
                    var result = manifest
                    result["cancelled"] = false
                    result["captureId"] = captureId
                    result["uploaded"] = true
                    result["videoUri"] = NSNull()
                    result["plyUri"] = NSNull()
                    result["posesUri"] = NSNull()
                    // Drive the WebView to the per-capture submit funnel (loads by captureId,
                    // so it survives a fresh WebView load with no in-memory web state). This is
                    // the "scan ready → cost → process → status → view" screen — NOT the generic
                    // home/upload page that the earlier "/digital-twin" navigation landed on.
                    self.navigateWebView(
                        to: "/digital-twin/capture/submit?captureId=\(captureId)",
                        apiBase: apiBase
                    )
                    self.resolveCapture(result)
                } catch {
                    NSLog("[Slate360] Twin native upload failed: \(error.localizedDescription)")
                    self.presentNativeNotice("Scan captured (\(pts) pts) but upload failed:\n\(error.localizedDescription)")
                    var payload: [String: Any] = [
                        "cancelled": false,
                        "uploadError": error.localizedDescription,
                    ]
                    if let ue = error as? TwinUploader.UploadError, let code = ue.statusCode {
                        if code == 402 || code == 403 { payload["errorCode"] = "insufficient" }
                    }
                    self.resolveCapture(payload)
                }
            }
        }
    }

    /// Shows a native (UIKit) popup that does not depend on the WebView — used to report the
    /// capture/upload outcome even when the WebView content process has been reclaimed.
    /// TEMPORARY diagnostic + confirmation; folds into the capture-screen redesign later.
    private func presentNativeNotice(_ message: String) {
        DispatchQueue.main.async { [weak self] in
            guard let presenter = self?.bridge?.viewController else { return }
            let alert = UIAlertController(title: "Twin capture", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            presenter.present(alert, animated: true)
        }
    }

    /// Loads a fresh URL into the bridge WebView. Used to land the user on a server-backed
    /// page after capture so the flow doesn't depend on the pre-capture in-memory web state.
    private func navigateWebView(to path: String, apiBase: String) {
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView,
                  let url = URL(string: apiBase + path) else { return }
            webView.load(URLRequest(url: url))
        }
    }

    /// Resolves the pending capture call on the main thread and clears it.
    private func resolveCapture(_ payload: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.pendingCaptureCall?.resolve(payload)
            self.pendingCaptureCall = nil
        }
    }

    /// Collects the WKWebView's cookies for the app origin into a `Cookie:` header string.
    /// Supabase chunks its auth token across several `sb-…-auth-token[.n]` cookies, so we
    /// forward every cookie for the slate360.ai domain. Must run on the main thread.
    private func collectCookieHeader(completion: @escaping (String) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.bridge?.webView else { completion(""); return }
            let store = webView.configuration.websiteDataStore.httpCookieStore
            store.getAllCookies { cookies in
                let header = cookies
                    .filter { $0.domain.contains("slate360.ai") }
                    .map { "\($0.name)=\($0.value)" }
                    .joined(separator: "; ")
                completion(header)
            }
        }
    }

    @objc func dismissCapture(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.captureVC?.stopAndCleanup()
            call.resolve()
        }
    }

    @objc func startSession(_ call: CAPPluginCall) {
        guard !isRunning else { call.resolve(); return }

        switch call.getString("confidence") ?? "medium" {
        case "low":  confidenceThreshold = .low
        case "high": confidenceThreshold = .high
        default:     confidenceThreshold = .medium
        }

        sessionStartTime = Date().timeIntervalSince1970

        dataQueue.async { [weak self] in
            guard let self = self else { return }
            self.voxelGrid.removeAll(keepingCapacity: true)
            self.keyframes.removeAll(keepingCapacity: true)
            self.lastKeyframeTime = 0
            self.sessionId = UUID().uuidString
        }

        setupLocation()

        let config = ARWorldTrackingConfiguration()
        // Prefer smoothed depth; fall back to raw sceneDepth.
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) {
            config.frameSemantics = .smoothedSceneDepth
        } else if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            config.frameSemantics = .sceneDepth
        } else {
            call.reject("LiDAR depth not supported on this device")
            return
        }
        // Y-up world alignment so gravity vector is always [0, 1, 0].
        config.worldAlignment = .gravity

        arSession = ARSession()
        arSession?.delegate = self
        arSession?.run(config, options: [.resetTracking, .removeExistingAnchors])
        isRunning = true

        progressTimer?.invalidate()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.dataQueue.async {
                let count = self.voxelGrid.count
                DispatchQueue.main.async {
                    self.notifyListeners("progress", data: ["pointCount": count])
                }
            }
        }

        call.resolve()
    }

    @objc func stopSession(_ call: CAPPluginCall) {
        guard isRunning else {
            call.resolve(["pointCount": 0, "keyframeCount": 0])
            return
        }

        progressTimer?.invalidate()
        progressTimer = nil
        arSession?.pause()
        arSession = nil
        locationManager?.stopUpdatingLocation()
        isRunning = false

        dataQueue.async { [weak self] in
            guard let self = self else { return }
            let pts = self.voxelGrid.count
            let kfs = self.keyframes.count
            DispatchQueue.main.async {
                call.resolve(["pointCount": pts, "keyframeCount": kfs])
            }
        }
    }

    @objc func exportData(_ call: CAPPluginCall) {
        dataQueue.async { [weak self] in
            guard let self = self else { return }

            guard !self.voxelGrid.isEmpty || !self.keyframes.isEmpty else {
                DispatchQueue.main.async { call.reject("No data captured") }
                return
            }

            let sid = self.sessionId.isEmpty ? UUID().uuidString : self.sessionId
            let tmp = URL(fileURLWithPath: NSTemporaryDirectory())
            let plyURL   = tmp.appendingPathComponent("\(sid).ply")
            let posesURL = tmp.appendingPathComponent("\(sid)_poses.json")

            self.writePLY(to: plyURL)
            self.writePosesJSON(to: posesURL)

            DispatchQueue.main.async {
                call.resolve([
                    "plyUri":    plyURL.absoluteString,
                    "posesUri":  posesURL.absoluteString,
                    "pointCount": self.voxelGrid.count,
                ])
            }
        }
    }

    @objc func cleanup(_ call: CAPPluginCall) {
        dataQueue.async { [weak self] in
            self?.voxelGrid.removeAll()
            self?.keyframes.removeAll()
            self?.sessionId = ""
            DispatchQueue.main.async { call.resolve() }
        }
    }

    // MARK: - ARSessionDelegate

    public func session(_ session: ARSession, didUpdate frame: ARFrame) {
        guard isRunning else { return }

        // Pick the best available depth source.
        let depthAnchor = frame.smoothedSceneDepth ?? frame.sceneDepth
        guard let depthMap = depthAnchor?.depthMap,
              let confMap  = depthAnchor?.confidenceMap else { return }

        let transform   = frame.camera.transform
        let intrinsics  = frame.camera.intrinsics
        let fx = intrinsics[0][0], fy = intrinsics[1][1]
        let cx = intrinsics[2][0], cy = intrinsics[2][1]
        let width  = CVPixelBufferGetWidth(depthMap)
        let height = CVPixelBufferGetHeight(depthMap)

        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        CVPixelBufferLockBaseAddress(confMap,  .readOnly)
        defer {
            CVPixelBufferUnlockBaseAddress(depthMap, .readOnly)
            CVPixelBufferUnlockBaseAddress(confMap,  .readOnly)
        }

        guard let depthPtr = CVPixelBufferGetBaseAddress(depthMap),
              let confPtr  = CVPixelBufferGetBaseAddress(confMap) else { return }

        let depthBuf = depthPtr.assumingMemoryBound(to: Float32.self)
        let confBuf  = confPtr.assumingMemoryBound(to: UInt8.self)

        // Copy what we need off the pixel buffers before leaving the lock scope.
        var newVoxels = [(key: SIMD3<Int32>, data: PointData)]()
        let step = 3 // sample every 3rd pixel (~11% of total, still very dense)

        for row in stride(from: 0, to: height, by: step) {
            for col in stride(from: 0, to: width, by: step) {
                let idx  = row * width + col
                let conf = ARConfidenceLevel(rawValue: Int(confBuf[idx])) ?? .low
                guard conf.rawValue >= confidenceThreshold.rawValue else { continue }

                let depth = depthBuf[idx]
                guard depth > 0.1, depth < 8.0 else { continue }

                // Unproject to camera space (ARKit: camera looks in -Z direction).
                let xc = (Float(col) - cx) * depth / fx
                let yc = (Float(row) - cy) * depth / fy
                let zc = -depth

                // Transform to world space.
                let world = transform * SIMD4<Float>(xc, yc, zc, 1.0)
                let pos = SIMD3<Float>(world.x, world.y, world.z)

                let vk = SIMD3<Int32>(
                    Int32(floor(pos.x / voxelSize)),
                    Int32(floor(pos.y / voxelSize)),
                    Int32(floor(pos.z / voxelSize))
                )
                // Grey placeholder — real RGB requires YCbCr→RGB conversion on
                // frame.capturedImage, which adds GPU work. For a depth prior the
                // geometry matters far more than colour.
                newVoxels.append((key: vk, data: PointData(position: pos, color: SIMD3<UInt8>(180, 180, 180))))
            }
        }

        let now = Date().timeIntervalSince1970
        let recordKeyframe = now - lastKeyframeTime >= keyframeInterval
        let keyframeData: [String: Any]? = recordKeyframe ? buildKeyframe(frame: frame, transform: transform, intrinsics: intrinsics) : nil

        dataQueue.async { [weak self] in
            guard let self = self else { return }

            for (key, data) in newVoxels where self.voxelGrid[key] == nil {
                self.voxelGrid[key] = data
            }
            // Trim to max if we've grown too large.
            if self.voxelGrid.count > self.maxPoints {
                let excess = self.voxelGrid.count - self.maxPoints
                let toRemove = self.voxelGrid.keys.prefix(excess)
                for k in toRemove { self.voxelGrid.removeValue(forKey: k) }
            }

            if let kf = keyframeData {
                self.keyframes.append(kf)
                self.lastKeyframeTime = now
            }
        }
    }

    // MARK: - Helpers

    private func buildKeyframe(frame: ARFrame, transform: simd_float4x4, intrinsics: simd_float3x3) -> [String: Any] {
        // Column-major [16] float array — standard for downstream COLMAP conversion.
        let cols = [transform.columns.0, transform.columns.1, transform.columns.2, transform.columns.3]
        let flat: [Float] = cols.flatMap { [$0.x, $0.y, $0.z, $0.w] }

        let resolution = frame.camera.imageResolution
        var kf: [String: Any] = [
            "timestamp": Date().timeIntervalSince1970,
            "transform_4x4": flat,
            "intrinsics": [
                "fx": intrinsics[0][0],
                "fy": intrinsics[1][1],
                "cx": intrinsics[2][0],
                "cy": intrinsics[2][1],
            ],
            // worldAlignment=.gravity guarantees world Y == up.
            "gravity": [0.0, 1.0, 0.0],
            // Image dimensions for transforms.json construction in the cloud worker.
            "w": Int(resolution.width),
            "h": Int(resolution.height),
        ]

        if let loc = currentLocation {
            kf["gps"] = ["lat": loc.coordinate.latitude, "lon": loc.coordinate.longitude, "alt": loc.altitude]
        }

        return kf
    }

    private func writePLY(to url: URL) {
        let pts = Array(voxelGrid.values)
        var data = Data()
        let header = """
        ply\nformat binary_little_endian 1.0\nelement vertex \(pts.count)\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n
        """
        data.append(contentsOf: header.utf8)
        for pt in pts {
            var x = pt.position.x, y = pt.position.y, z = pt.position.z
            var r = pt.color.x,   g = pt.color.y,   b = pt.color.z
            withUnsafeBytes(of: &x) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &y) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &z) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &r) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &g) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &b) { data.append(contentsOf: $0) }
        }
        try? data.write(to: url)
    }

    private func writePosesJSON(to url: URL) {
        let payload: [String: Any] = [
            "version": 2,
            "session_start_time": sessionStartTime,
            "frames": keyframes,
        ]
        if let data = try? JSONSerialization.data(withJSONObject: payload, options: .prettyPrinted) {
            try? data.write(to: url)
        }
    }

    // MARK: - Location

    private func setupLocation() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyBest
        locationManager?.requestWhenInUseAuthorization()
        locationManager?.startUpdatingLocation()
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        currentLocation = locations.last
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // GPS is optional — failure is non-fatal.
    }
}
