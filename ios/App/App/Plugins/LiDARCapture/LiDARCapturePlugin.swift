import Foundation
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
public class LiDARCapturePlugin: CAPPlugin, ARSessionDelegate, CLLocationManagerDelegate {

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
        call.resolve(["available": ARWorldTrackingConfiguration.isSupported && supportsDepth])
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
